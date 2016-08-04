import React from 'react';
import { Link } from 'react-router';

import CalendarSvg from 'components/CalendarSvg';

import { parseSchedule } from 'utils/postgres';
import { apiFetch } from 'utils/api';

import styles from './styles.css';

export default class SessionTileView extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    session: React.PropTypes.object,
  }
  static contextTypes = {
    user: React.PropTypes.object,
  }
  getTitle() {
    const { session } = this.props;
    return `${session.title ? session.title : '(Untitled)'}`;
  }
  isOwner() {
    const { session } = this.props;
    const { user } = this.context;
    return user && session.owner === user.user_id;
  }
  delete = () => {
    const { session } = this.props;
    if (confirm('Are you sure you want to delete?', 'Delete', 'Cancel')) {
      apiFetch(`/api/session/${session.uuid}/delete`).then((response) => {
        if (response.status === 'success') {
          window.location.reload();
        } else {
          alert('Failed to delete session');
        }
      });
    }
  }
  renderActions() {
    const { session } = this.props;
    const actions = [
      { key: session.href, item: <Link to={session.href}>View</Link> }
    ];
    if (this.isOwner()) {
      actions.push({ key: 'edit', item: <Link to={`${session.href}/edit`}>Edit</Link> });
      actions.push({ key: 'delete', item: <a onClick={this.delete} className={styles.delete}>Delete</a> });
    }
    return (<ol className={styles.actions}>
      {actions.map((action) => <li key={action.key}>{action.item}</li>)}
    </ol>);
  }
  renderAddSchedule() {
    if (!this.isOwner()) return (<li>No schedule yet</li>);
    return (<li className={styles.addSchedule}>
      <Link to={`${this.props.session.href}/edit`}><b>+</b> Add a schedule</Link>
    </li>);
  }
  render() {
    const { session } = this.props;
    const date = parseSchedule(session);
    let { state } = session;
    const stateDisplayNames = { published: 'live', unpublished: 'draft' };
    if (state in stateDisplayNames) state = stateDisplayNames[state];
    const schedules = [];
    if (date.date || date.time) {
      schedules.push(<li className={styles.schedule} key="schedule1">
        <CalendarSvg />
        <span>{date.date} <span className={styles.time}>at {date.time}</span></span>
      </li>);
    }
    return (
      <article className={styles.tile}>
        <div className={styles.imgCol}>
          <img src="/images/placeholder.png" role="presentation" />
        </div>
        <div className={styles.textCol}>
          <div className={styles.info}>
            <h1><Link to={session.href}>{this.getTitle()}</Link></h1>
            <div className={styles.location}>{session.location}</div>
          </div>
          <div className={styles.actions}>
            {this.renderActions()}
            <div className={`${styles.state} ${state === 'live' ? styles.live : ''}`}>{state}</div>
          </div>
        </div>
        <div className={styles.schedules}>
          <div>{schedules.length} SCHEDULED</div>
          <ol>
            {schedules.length ? schedules : this.renderAddSchedule()}
          </ol>
        </div>
      </article>
    );
  }
}
