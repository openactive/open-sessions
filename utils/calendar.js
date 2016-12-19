const moment = require('moment');

const pgTimeToDate = time => new Date(`2000-01-01 ${time}`);

function parseSchedule(instance) {
  const { startDate, startTime, endTime } = instance;
  const data = {};
  const now = new Date();
  if (startDate) {
    const date = new Date(startTime ? [startDate, startTime].join('T') : startDate);
    data.date = moment(date).format(date.getFullYear() === now.getFullYear() ? 'dddd D MMM' : 'dddd D MMM YYYY');
    data.hasOccurred = date.getTime() <= now.getTime();
  }
  if (startTime) {
    data.time = startTime.slice(0, 5);
    if (endTime) {
      const dur = moment.duration(moment(pgTimeToDate(endTime)).diff(moment(pgTimeToDate(startTime))));
      const hours = (dur.asHours() + 24) % 24;
      const hoursInt = Math.floor(hours);
      const minsInt = Math.ceil((hours % 1) * 60);
      data.duration = [hoursInt ? `${hoursInt}h` : '', minsInt ? ` ${minsInt}m` : ''].join('');
    }
  }
  return data;
}

function calendarLinks(schedule, title, description, location) {
  const { startDate, startTime, endTime } = schedule;
  const dates = [startTime, endTime].map(time => [startDate, time].join('T').replace(/-|:|\.\d\d\d/g, ''));
  return {
    googleCalendar: `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates.join('/')}&details=${description}&location=${location}&sprop=&sprop=name:`
  };
}

function sortSchedule(schedules) {
  if (!(schedules && schedules.length)) return [];
  return schedules.map(slot => Object.assign({}, {
    start: new Date([slot.startDate, slot.startTime].join('T')),
    end: new Date([slot.startDate, slot.endTime].join('T'))
  }, slot)).sort((a, b) => a.start - b.start);
}

function nextSchedule(schedules) {
  return sortSchedule(schedules).find(schedule => schedule.start > Date.now());
}

module.exports = { parseSchedule, calendarLinks, sortSchedule, nextSchedule };
