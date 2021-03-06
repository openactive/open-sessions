const express = require('express');
const jwt = require('express-jwt');
const dotenv = require('dotenv');
const fs = require('fs');
const sendgrid = require('sendgrid');

const { rdpe } = require('./rdpe.js');
const s3 = require('./s3.js');
const ApiError = require('../error.js');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { authClient, getAllUsers } = require('../../storage/users');

const capitalize = string => `${string[0].toUpperCase()}${string.substr(1)}`;

dotenv.config({ silent: true });
dotenv.load();


// wrapper around handlers to catch any unanticipated exceptions
const tryCatch = (fn) =>
  (req, res, next) => {
    try {
      fn(req, res, next);
    } catch (ex) {
      next(ex);
    }
  };


module.exports = (database) => {
  const { LOCALE_TIMEZONE, SERVICE_LOCATION, ADMIN_DOMAIN, AUTH0_CLIENT_SECRET, AUTH0_CLIENT_ID } = process.env;
  const api = express();
  const getUser = req => (req.user ? req.user.sub : null);
  const logRequests = (req, res, next) => { // eslint-disable-line no-unused-vars
    console.log(':: /api', req.path);
    next();
  };

  const rdpeConfig = { timezone: LOCALE_TIMEZONE, scrubTimezone: true, URL: SERVICE_LOCATION, legacyOrganizerMerge: true };
  api.use('/rdpe', rdpe(database, Object.assign({ baseURL: '/api/rdpe' }, rdpeConfig)));
  api.use('/rdpe-legacy', rdpe(database, Object.assign({}, rdpeConfig, { preserveLatLng: true, baseURL: '/api/rdpe-legacy' })));

  api.get('/', tryCatch((req, res) => {
    res.json({
      request: {
        headers: ['Authorization: bearer ${json web token}']
      },
      routes: [
        { url: '/rdpe', description: 'RDPE endpoint' },
        { url: '/session', description: 'Session search' },
        { url: '/session/:uuid', description: 'Session detail', methods: { GET: 'Get session', POST: 'Mutate session' } },
        {
          url: '/admin',
          description: 'Admin API',
          isAdmin: true,
          routes: [
            { url: '/users', description: 'List users' }
          ]
        }
      ]
    });
  }));

  const requireLogin = jwt({
    secret: new Buffer(AUTH0_CLIENT_SECRET, 'base64'),
    audience: AUTH0_CLIENT_ID
  });

  let admins;
  let adminsRefreshed;
  const isAdmin = user => {
    const [nowHours, adminHours] = [new Date(), adminsRefreshed || new Date(0)].map(d => (d.getTime() / (1000 * 60 * 60)));
    return new Promise((resolve, reject) => {
      if (admins && nowHours - adminHours > 1) {
        resolve(admins.some(admin => admin.user_id === user.sub));
      } else {
        authClient.getUsers({ q: `email:"@${ADMIN_DOMAIN}"` }).then(users => {
          admins = users;
          adminsRefreshed = new Date();
          resolve(admins.some(admin => admin.user_id === user.sub));
        }).catch(reject);
      }
    });
  };

  const checkIsAdmin = tryCatch((req, res, next) => {
    if (req.isAdmin) {
      return next();
    }
    const responseData = { status: 'failure', message: 'Admin only path' };
    return next(ApiError.init(401, responseData, new Error(responseData.message)));
  });

  const processUser = tryCatch((req, res, next) => {
    req.isAdmin = false;
    requireLogin(req, res, () => {
      if (req.user) {
        isAdmin(req.user).then(admin => {
          req.isAdmin = admin;
          next();
        }).catch(() => next());
      } else {
        next();
      }
    });
  });

  const resolveModel = tryCatch((req, res, next) => {
    const modelName = capitalize(req.params.model);
    if (modelName in database.models) {
      req.Model = database.models[modelName];
      return next();
    }
    const responseData = { error: `Model '${modelName}' does not exist` };
    return next(ApiError.init(404, responseData, new Error(responseData.error)));
  });

  const timeFields = ['createdAt', 'updatedAt'];

  const queryParse = (req, Model) => {
    const query = req.query || {};
    if (query) {
      Object.keys(query).filter(key => key[0] === key[0].toUpperCase() && query[key] === 'null').forEach(key => {
        query[key] = null;
      });
      Object.keys(query).filter(key => timeFields.some(field => field === key)).forEach(key => {
        const date = new Date(query[key]);
        let dates;
        switch (query[key].length) {
          case 4:
            query[key] = { $gte: date, $lt: new Date(new Date(date).setFullYear(date.getFullYear() + 1)) };
            break;
          case 7:
            query[key] = { $gte: date, $lt: new Date(new Date(date).setMonth(date.getMonth() + 1)) };
            break;
          case 10:
            query[key] = { $gte: date, $lt: new Date(new Date(date).setDate(date.getDate() + 1)) };
            break;
          case 21:
            dates = query[key].split(':').map(d => new Date(d)).map((d, k) => new Date(d.setDate(d.getDate() + k)));
            query[key] = { $gte: dates[0], $lt: dates[1] };
            break;
          default:
            break;
        }
      });
    }
    if (Model && Model.queryParse) return Model.queryParse(query);
    return query;
  };

  const instanceToJSON = (instance, req) => {
    const json = Object.assign(instance.get(), {
      actions: instance.getActions ? instance.getActions(database.models, req) : null
    });
    ['Sessions'].filter(type => json[type]).forEach(type => {
      json[type] = json[type].map(child => instanceToJSON(child, req));
    });
    return json;
  };

  const isEmail = email => {
    const regex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i; // eslint-disable-line no-useless-escape
    return regex.test(email);
  };

  api.post('/auth-email', tryCatch((req, res, next) => {
    const { email } = req.body;
    if (isEmail(email)) {
      authClient.getUsers({ q: `email:"${email}"` }).then(users => {
        res.json({ status: 'success', exists: users.length >= 1 });
      }).catch(error => {
        const responseData = { status: 'failure', error };
        return next(ApiError.init(500, responseData, error));
      });
    } else {
      const responseData = { status: 'failure', error: 'Invalid email address' };
      next(ApiError.init(500, responseData, new Error(responseData.error)));
    }
  }));

  api.get('/stats', tryCatch((req, res) => {
    database.models.Session.findAll().then(sessions => {
      res.json({ sessions: { total: sessions.length, published: sessions.filter(session => session.state === 'published').length } });
    });
  }));

  const admin = express();

  admin.get('/stats', tryCatch((req, res) => {
    database.models.Session.findAll().then(sessions => {
      res.json({ sessions: { total: sessions.length, published: sessions.filter(session => session.state === 'published').length } });
    });
  }));

  admin.get('/users', tryCatch((req, res) => {
    getAllUsers().then(users => {
      res.json({ users });
    });
  }));

  const twoSF = number => (number > 9 ? number : `0${number}`);
  const dateFormat = date => `${date.getFullYear()}-${twoSF(date.getMonth() + 1)}-${twoSF(date.getDate())}`;

  admin.get('/emails', tryCatch((req, res, next) => {
    const { days, categories } = req.query;
    const { SENDGRID_SECRET } = process.env;
    const sg = sendgrid(SENDGRID_SECRET);
    const request = sg.emptyRequest();
    request.queryParams.aggregated_by = 'day';
    request.queryParams.limit = '1';
    const now = new Date();
    const DAY = 1000 * 60 * 60 * 24;
    request.queryParams.start_date = dateFormat(new Date(now.getTime() - (DAY * days)));
    request.queryParams.end_date = dateFormat(now);
    request.queryParams.offset = '1';
    if (categories) request.queryParams.categories = categories.split(',');
    request.method = 'GET';
    request.path = '/v3/categories/stats';
    sg.API(request).then(response => {
      res.json({ emails: response.body });
    }).catch(err => {
      const responseData = { message: 'Failed to load emails', error: err, content: err ? err.message : '' };
      return next(ApiError.init(400, responseData, err));
    });
  }));

  api.use('/admin', processUser, checkIsAdmin, admin);

  api.get('/config.js', tryCatch((req, res) => {
    const windowKeys = ['GOOGLE_MAPS_API_KEY', 'SEGMENT_WRITE_KEY', 'AWS_S3_IMAGES_BASEURL', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_DOMAIN', 'LOCALE_COUNTRY', 'ADMIN_DOMAIN', 'SENTRY_DSN_PUBLIC'];
    res.send(`
      ${windowKeys.map(key => `window["${key}"] = '${process.env[key]}'`).join(';\n')};
      function addScript(src) {
        var script = document.createElement('script');
        script.src = src;
        document.head.appendChild(script);
      }
      addScript("https://maps.googleapis.com/maps/api/js?key=" + window.GOOGLE_MAPS_API_KEY + "&libraries=places");
    `);
  }));

  api.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });

  api.get('/leader-list', requireLogin, tryCatch((req, res) => {
    const { Session } = database.models;
    Session.findAll(Session.getQuery({ where: { owner: getUser(req) } }, database.models, getUser(req))).then(instances => {
      const list = instances.map(s => s.leader).concat(instances.map(s => s.info.contact.name)).filter(name => name);
      return res.json({ list: list.filter((name, key) => list.indexOf(name) === key) });
    });
  }));

  api.get('/:model', resolveModel, tryCatch((req, res, next) => {
    const { Model } = req;
    const { canAct } = req.query;
    delete req.query.canAct;
    processUser(req, res, () => {
      const query = Model.getQuery({ where: queryParse(req, Model) }, database.models, getUser(req));
      if (query instanceof Error) {
        return next(ApiError.init(400, { status: 'failure' }, query));
      }
      return Model.findAll(query).then(instances => {
        res.json({ instances: instances.map(instance => instanceToJSON(instance, req)).filter(instance => (canAct ? instance.actions.some(action => action === canAct) : true)) });
      }).catch(error =>
        next(ApiError.init(404, { error: error.message }, error))
      );
    });
  }));

  api.all('/:model/action/new', processUser, resolveModel, (req, res, next) => {
    const { Model } = req;
    if (Model.new) {
      if (Model.getActions(database.models, req).some(action => action === 'new')) {
        return Model.new(req, database.models)
          .then(result =>
            res.json(result.raw ? result : { instance: instanceToJSON(result, req) })
          )
          .catch(result => {
            const responseData = result.raw ? result : { error: result.message };
            return next(ApiError.init(400, responseData, result));
          });
      }
      const responseData = { error: `Permission denied to create ${req.params.model}` };
      return next(ApiError.init(401, responseData, new Error(responseData.error)));
    }
    const getPrototype = Model.getPrototype || (() => Promise.resolve({}));
    return getPrototype(database.models, getUser(req)).then(data => {
      Object.keys(req.body).forEach(key => {
        data[key] = req.body[key];
      });
      data.owner = getUser(req);
      Model.create(data).then(instance =>
        res.json({ instance: instanceToJSON(instance, req) })
      ).catch(error => {
        const responseData = { error: error.message };
        return next(ApiError.init(404, responseData, error));
      });
    });
  });

  api.all('/:model/action/:action', processUser, resolveModel, (req, res, next) => {
    const { Model } = req;
    const { action } = req.params;
    if (Model[action]) {
      if (Model.getActions(database.models, req).some(a => a === action)) {
        return Model[action](req, database.models)
          .then(result => {
            res.json(result.raw ? result : { instance: instanceToJSON(result, req) });
          })
          .catch(error => {
            const responseData = { error: error.message };
            return next(ApiError.init(404, responseData, error));
          });
      }
      const responseData = { error: `Permission denied on ${req.params.model} with action ${action}` };
      return next(ApiError.init(400, responseData, new Error(responseData.error)));
    }
    const responseData = { error: 'Unrecognized action' };
    return next(ApiError.init(400, responseData, new Error(responseData.error)));
  });

  api.get('/:model/:uuid', resolveModel, (req, res, next) => {
    const { Model } = req;
    const { uuid } = req.params;
    processUser(req, res, () => {
      const query = Model.getQuery({ where: Object.assign({}, req.query, { uuid }) }, database.models, getUser(req));
      if (query instanceof Error) {
        const responseData = { status: 'failure', error: query.message };
        return next(ApiError.init(400, responseData, query));
      }
      return Model.findOne(query).then(instance => {
        if (!instance) throw new Error('Instance could not be retrieved');
        return res.json({ instance: instanceToJSON(instance, req) });
      }).catch(error => {
        const responseData = { error: error.message, isLoggedIn: !!req.user };
        return next(ApiError.init(404, responseData, error));
      });
    });
  });

  api.post('/:model/:uuid', requireLogin, resolveModel, (req, res, next) => {
    const { Model } = req;
    const { uuid } = req.params;
    const query = Model.getQuery({ where: { uuid } }, database.models, getUser(req));
    if (query instanceof Error) {
      const responseData = { status: 'failure', error: query.message };
      return next(ApiError.init(400, responseData, query));
    }
    return Model.findOne(query).then(instance => {
      const actions = instance.getActions(database.models, req);
      if (!actions.some(action => action === 'edit')) throw new Error(`Must be owner to modify ${Model.name}`);
      const fields = Object.keys(req.body);
      fields.filter(key => key.slice(-4) === 'Uuid').filter(key => req.body[key] === null).map(key => `set${key.replace(/Uuid$/, '')}`).forEach(setter => {
        if (instance[setter]) instance[setter](null);
      });
      if (query.include) {
        query.include.forEach(model => {
          delete req.body[model.name];
        });
      }
      return instance.update(req.body, { returning: true }).then(savedInstance =>
        res.json({ instance: instanceToJSON(savedInstance, req) })
      );
    }).catch(error => {
      const responseData = { error: error.message };
      return next(ApiError.init(404, responseData, error));
    });
  });

  api.all('/:model/:uuid/action/:action', resolveModel, (req, res, next) => {
    const { Model } = req;
    const { uuid, action } = req.params;
    return processUser(req, res, () => {
      const user = getUser(req);
      const query = Model.getQuery({ where: { uuid } }, database.models, user);
      if (query instanceof Error) {
        const responseData = { status: 'failure', error: query.message };
        return next(ApiError.init(400, responseData, query));
      }
      return Model.findOne(query).then(instance => {
        const actions = instance.getActions(database.models, req);
        if (actions.indexOf(action) !== -1) {
          return instance[action](req, database.models)
            .then(result => res.json(Object.assign({ status: 'success' }, result)))
            .catch(error => {
              const responseData = { status: 'failure', error: error.message };
              return next(ApiError.init(404, responseData, error));
            });
        }
        const responseData = { status: 'failure', error: `'${action}' is an unavailable action` };
        return next(ApiError.init(500, responseData, new Error(responseData.error)));
      }).catch(error => {
        const responseData = { status: 'failure', error: 'Record not found', message: (error && error.message ? error.message : error).toString(), query: query.where };
        return next(ApiError.init(404, responseData, error));
      });
    });
  });

  api.post('/:model/:uuid/:field', requireLogin, resolveModel, upload.single('image'), (req, res, next) => {
    const { Model } = req;
    const image = req.file;
    const getNewImgPath = (instance, field) => {
      let version = 1;
      if (instance[field]) {
        const v = instance[field].split(`${instance.uuid}-`);
        version = parseInt(v[1], 10) + 1;
        if (isNaN(version)) version = 1;
      }
      return [instance.uuid, version].join('-');
    };
    if (image) {
      const { model, uuid, field } = req.params;
      const aws = {
        URL: process.env.AWS_S3_IMAGES_BASEURL,
        path: `uploads/${model}/${field}/`,
        accessKeyId: process.env.AWS_S3_IMAGES_ACCESSKEY,
        secretAccessKey: process.env.AWS_S3_IMAGES_SECRETKEY
      };
      Model.findOne({ where: { uuid, owner: getUser(req) } })
        .then(instance => s3(aws, image.path, getNewImgPath(instance, field))
          .then(result => {
            const data = {};
            data[field] = `https://${aws.URL}/${result.versions[model === 'organizer' ? 0 : 1].key}`;
            [image].concat(result.versions).forEach(version => fs.unlink(version.path));
            return instance.update(data)
              .then(final => res.json({ status: 'success', result, baseURL: aws.URL, instance: final }));
          }).catch(error => {
            const responseData = { error };
            return next(ApiError.init(400, responseData, error));
          }))
        .catch(error =>
           next(ApiError.init(404, { error }, error))
        );
    } else {
      next();
    }
  });

  return api;
};
