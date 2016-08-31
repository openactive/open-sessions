/**
 * App.react.js
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React, { PropTypes } from 'react';
import Auth0Lock from 'auth0-lock';
import Intercom from 'react-intercom';
import Helmet from 'react-helmet';

import Header from 'components/Header';
import Footer from 'components/Footer';
import getUserToken from './getUserToken';

import styles from './styles.css';

const cookieConsent = () => {
  window.cookieconsent_options = {
    message: 'This website uses cookies to ensure you get the best experience on our website',
    dismiss: 'Got it!',
    learnMore: 'More info',
    link: null,
    theme: 'dark-floating'
  };
  // eslint-disable-next-line
  !function(){if(!window.hasCookieConsent){window.hasCookieConsent=!0;var e="cookieconsent_options",t="update_cookieconsent_options",n="cookieconsent_dismissed",i="//cdnjs.cloudflare.com/ajax/libs/cookieconsent2/1.0.10/";if(!(document.cookie.indexOf(n)>-1||window.navigator&&window.navigator.CookiesOK)){"function"!=typeof String.prototype.trim&&(String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"")});var o,s={isArray:function(e){var t=Object.prototype.toString.call(e);return"[object Array]"==t},isObject:function(e){return"[object Object]"==Object.prototype.toString.call(e)},each:function(e,t,n,i){if(s.isObject(e)&&!i)for(var o in e)e.hasOwnProperty(o)&&t.call(n,e[o],o,e);else for(var r=0,a=e.length;a>r;r++)t.call(n,e[r],r,e)},merge:function(e,t){e&&s.each(t,function(t,n){s.isObject(t)&&s.isObject(e[n])?s.merge(e[n],t):e[n]=t})},bind:function(e,t){return function(){return e.apply(t,arguments)}},queryObject:function(e,t){var n,i=0,o=e;for(t=t.split(".");(n=t[i++])&&o.hasOwnProperty(n)&&(o=o[n]);)if(i===t.length)return o;return null},setCookie:function(e,t,n,i,o){n=n||365;var s=new Date;s.setDate(s.getDate()+n);var r=[e+"="+t,"expires="+s.toUTCString(),"path="+o||"/"];i&&r.push("domain="+i),document.cookie=r.join(";")},addEventListener:function(e,t,n){e.addEventListener?e.addEventListener(t,n):e.attachEvent("on"+t,n)}},r=function(){var e="data-cc-event",t="data-cc-if",n=function(e,t,i){return s.isArray(t)?s.each(t,function(t){n(e,t,i)}):void(e.addEventListener?e.addEventListener(t,i):e.attachEvent("on"+t,i))},i=function(e,t){return e.replace(/\{\{(.*?)\}\}/g,function(e,n){for(var i,o,r=n.split("||");o=r.shift();){if(o=o.trim(),'"'===o[0])return o.slice(1,o.length-1);if(i=s.queryObject(t,o))return i}return""})},o=function(e){var t=document.createElement("div");return t.innerHTML=e,t.children[0]},r=function(e,t,n){var i=e.parentNode.querySelectorAll("["+t+"]");s.each(i,function(e){var i=e.getAttribute(t);n(e,i)},window,!0)},a=function(t,i){r(t,e,function(e,t){var o=t.split(":"),r=s.queryObject(i,o[1]);n(e,o[0],s.bind(r,i))})},c=function(e,n){r(e,t,function(e,t){var i=s.queryObject(n,t);i||e.parentNode.removeChild(e)})};return{build:function(e,t){s.isArray(e)&&(e=e.join("")),e=i(e,t);var n=o(e);return a(n,t),c(n,t),n}}}(),a={options:{message:"This website uses cookies to ensure you get the best experience on our website. ",dismiss:"Got it!",learnMore:"More info",link:null,target:"_self",container:null,theme:"light-floating",domain:null,path:"/",expiryDays:365,markup:['<div class="cc_banner-wrapper {{containerClasses}}">','<div class="cc_banner cc_container cc_container--open">','<a href="#null" data-cc-event="click:dismiss" target="_blank" class="cc_btn cc_btn_accept_all">{{options.dismiss}}</a>','<p class="cc_message">{{options.message}} <a data-cc-if="options.link" target="{{ options.target }}" class="cc_more_info" href="{{options.link || "#null"}}">{{options.learnMore}}</a></p>','<a class="cc_logo" target="_blank" href="http://silktide.com/cookieconsent">Cookie Consent plugin for the EU cookie law</a>',"</div>","</div>"]},init:function(){var t=window[e];t&&this.setOptions(t),this.setContainer(),this.options.theme?this.loadTheme(this.render):this.render()},setOptionsOnTheFly:function(e){this.setOptions(e),this.render()},setOptions:function(e){s.merge(this.options,e)},setContainer:function(){this.options.container?this.container=document.querySelector(this.options.container):this.container=document.body,this.containerClasses="",navigator.appVersion.indexOf("MSIE 8")>-1&&(this.containerClasses+=" cc_ie8")},loadTheme:function(e){var t=this.options.theme;-1===t.indexOf(".css")&&(t=i+t+".css");var n=document.createElement("link");n.rel="stylesheet",n.type="text/css",n.href=t;var o=!1;n.onload=s.bind(function(){!o&&e&&(e.call(this),o=!0)},this),document.getElementsByTagName("head")[0].appendChild(n)},render:function(){this.element&&this.element.parentNode&&(this.element.parentNode.removeChild(this.element),delete this.element),this.element=r.build(this.options.markup,this),this.container.firstChild?this.container.insertBefore(this.element,this.container.firstChild):this.container.appendChild(this.element)},dismiss:function(e){e.preventDefault&&e.preventDefault(),e.returnValue=!1,this.setDismissedCookie(),this.container.removeChild(this.element)},setDismissedCookie:function(){s.setCookie(n,"yes",this.options.expiryDays,this.options.domain,this.options.path)}},c=!1;(o=function(){c||"complete"!=document.readyState||(a.init(),c=!0,window[t]=s.bind(a.setOptionsOnTheFly,a))})(),s.addEventListener(document,"readystatechange",o)}}}();
};

export default class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    children: PropTypes.node,
  };
  static contextTypes = {
    router: PropTypes.object,
  };
  static childContextTypes = {
    user: PropTypes.object,
    lock: PropTypes.object,
    router: PropTypes.object,
    setMeta: PropTypes.func
  }
  constructor() {
    super();
    this.state = {
      profile: null,
    };
  }
  getChildContext() {
    return {
      user: this.state.profile,
      lock: this.lock, // both user and lock are stored in context as they both need to be accessible from multiple components across the app
      router: this.context.router,
      setMeta: this.setMeta
    };
  }
  componentWillMount() {
    this.createLock();
    this.setupProfile();
  }
  componentDidMount() {
    cookieConsent();
  }
  setMeta = meta => {
    this.setState({ meta });
  }
  setupProfile() {
    this.lock.getProfile(getUserToken(this.lock), (err, profile) => {
      if (err) {
        localStorage.removeItem('userToken');
        return false;
      }
      profile.logout = () => {
        this.setState({ profile: null });
      };
      this.setState({ profile });

      const { analytics } = window;
      if (analytics) {
        analytics.identify(profile.email, {
          name: profile.nickname,
          email: profile.email
        });
      }

      return true;
    });
  }
  createLock() {
    this.lock = new Auth0Lock('bSVd1LzdwXsKbjF7JXflIc1UuMacffUA', 'opensessions.eu.auth0.com');
  }
  render() {
    const { meta, profile, notifications } = this.state;
    const { INTERCOM_APPID } = window;
    const user = profile && INTERCOM_APPID ? { appID: INTERCOM_APPID, user_id: profile.user_id, email: profile.email, name: profile.nickname } : null;
    return (
      <div className={styles.root}>
        <Helmet meta={meta} />
        <Header lock={this.lock} notifications={notifications} />
        <div className={styles.appBody}>
          <div className={styles.container}>
            {this.props.children}
          </div>
          <Footer />
        </div>
        {user ? <Intercom {...user} /> : null}
      </div>
    );
  }
}
