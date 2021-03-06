import React, { PropTypes } from 'react';
import { Link } from 'react-router';

import Authenticated from '../Authenticated';
import LogoutLink from '../LogoutLink';
import Button from '../Button';

import styles from './styles.css';

export default class Footer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static contextTypes = {
    isAdmin: PropTypes.bool,
    modal: PropTypes.object,
  }
  render() {
    return (
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.column}>
            <h2>Info</h2>
            <p><Link to="/">About this site</Link></p>
            <p><Link to="/terms">Terms</Link></p>
            <p className={styles.iconInfo}><a href="https://github.com/opensessions/opensessions">Open Sessions</a> funded by <a href="https://londonsport.org">London Sport</a></p>
          </div>
          <div className={styles.column}>
            <Authenticated>
              <h2>Your account</h2>
              <p>
                <Button style={['slim', 'dark']} tip="Have a question or issue? Let us know!" icon={'/images/open-sessions-icon.png'} to="mailto:hello@opensessions.io" onClick={() => { window.location.href = 'mailto:hello@opensessions.io'; }}>
                  Message us!
                </Button>
              </p>
              <p><Link to="/profile">Profile</Link> • <Link to="/profile/calendar">Schedule</Link></p>
              <p><LogoutLink>Log out</LogoutLink></p>
            </Authenticated>
          </div>
          {this.context.isAdmin ? (<div className={styles.column}>
            <Authenticated>
              <h2>Admin</h2>
              <p><Link to="/dashboard">Dashboard</Link> • <Link to="/dashboard/users">Users</Link></p>
              <p>View sessions - <Link to="/sessions/map">Map</Link> • <Link to="/sessions">List</Link> • <Link to="/rdpe">RDPE</Link></p>
              <p><Link to="/activities">Activity list</Link></p>
              <p><Link to="/organizers">Organiser list</Link></p>
            </Authenticated>
          </div>) : null}
        </div>
      </footer>
    );
  }
}
