/*
 * Header
 */

import React from 'react';
import CSSModules from 'react-css-modules';
import { Link } from 'react-router';

import styles from './styles.css'; // eslint-disable-line no-unused-vars

import { NotAuthenticated, LoginLink, Authenticated } from 'react-stormpath';

class Header extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static contextTypes = {
    user: React.PropTypes.object,
  }
  render() {
    const user = this.context.user ? this.context.user : false;
    return (
      <header styleName="app__header" className="l__constrained">
        <Link to="/" styleName="header__logo">Open Sessions</Link>
        <nav className={styles.header__nav}>
          <Link to="/session/add" activeClassName="active">+ Add a session</Link>
          <NotAuthenticated>
            <LoginLink>log in</LoginLink>
          </NotAuthenticated>
          <Authenticated>
            <Link to="/profile">Hi, {user.givenName}</Link>
          </Authenticated>
        </nav>
      </header>
    );
  }
}

export default CSSModules(Header, styles);

// react-css-modules seems to have a bug when using styleName to refer to className in styles.css, so switched to using className={styles.class} for now
// Issue started by others affected: https://github.com/gajus/react-css-modules/issues/107
// TODO: fix and re-implement react-css-modules

// export default Header;
