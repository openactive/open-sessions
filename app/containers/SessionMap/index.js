import React, { PropTypes } from 'react';

import SessionTileView from '../SessionTileView';
import LoadingMessage from '../../components/LoadingMessage';
import Checkbox from '../../components/Fields/Checkbox';

import { withGoogleMap } from 'react-google-maps';
import GoogleMap from 'react-google-maps/lib/GoogleMap';
import MarkerClusterer from 'react-google-maps/lib/addons/MarkerClusterer';
import Marker from 'react-google-maps/lib/Marker';
import InfoWindow from 'react-google-maps/lib/InfoWindow';

import { apiModel } from '../../utils/api';

import styles from './styles.css';

const GEO_CENTER_UK = { lat: 54.3781, lng: -3.4360 };

const GoogleMapLoader = withGoogleMap(props => (
  <GoogleMap {...props.mapProps}>
    {props.markers}
  </GoogleMap>
));

const GoogleMapLoaderCluster = withGoogleMap(props => (
  <GoogleMap {...props.mapProps}>
    <MarkerClusterer>{props.markers}</MarkerClusterer>
  </GoogleMap>
));

const ACTIVE_ICON = { url: '/images/map-pin-active.svg' };
const INACTIVE_ICON = { url: '/images/map-pin.svg' };

export default class SessionMap extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static contextTypes = {
    notify: PropTypes.func,
    store: PropTypes.object
  };
  static propTypes = {
    location: PropTypes.object
  };
  static fetchData(dispatch, query) {
    return apiModel.search('session', { ...query, state: 'published' }).then(result => {
      const { instances, error } = result;
      if (error) throw error;
      dispatch({ type: 'SESSION_LIST_LOADED', payload: instances });
    });
  }
  constructor() {
    super();
    this.state = { isLoading: false, showInfo: null, isClustered: false };
  }
  componentDidMount() {
    this.setState({ isLoading: true }); // eslint-disable-line react/no-did-mount-set-state
    this.constructor.fetchData(this.context.store.dispatch, this.props.location.query).then(() => {
      this.setState({ isLoading: false });
    }).catch(error => {
      this.context.notify(error, 'error');
    });
  }
  isActive(session) {
    if (session.schedule) {
      return session.schedule.some(slot => (new Date([slot.startDate, slot.startTime].join('T'))).getTime() > Date.now());
    }
    return false;
  }
  renderMap(sessions) {
    const { google } = window;
    const marker = {
      defaultAnimation: 2
    };
    const googleMap = {
      defaultZoom: 6,
      defaultCenter: GEO_CENTER_UK,
      onClick: () => true,
      options: {
        streetViewControl: false,
        scrollwheel: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google ? google.maps.ControlPosition.TOP_LEFT : 1
        },
        mapTypeControl: false
      }
    };
    const { showInfo, isClustered } = this.state;
    const Loader = isClustered ? GoogleMapLoaderCluster : GoogleMapLoader;
    return (<Loader
      mapElement={<div style={{ height: '100%' }} />}
      containerElement={<div className={styles.mapFrame} style={{ height: '80vh', width: '100%' }} />}
      mapProps={googleMap}
      markers={sessions ? sessions.filter(session => session.locationData && session.locationData.lat).map(session => {
        const isActive = this.isActive(session);
        return (<Marker {...marker} icon={isActive ? ACTIVE_ICON : INACTIVE_ICON} key={session.uuid} position={session.locationData} onClick={() => this.setState({ showInfo: session.uuid })}>
          {showInfo === session.uuid ? <InfoWindow onCloseClick={() => this.setState({ showInfo: null })}><div style={{ maxWidth: '20em' }}><SessionTileView session={session} style="slim" /></div></InfoWindow> : null}
        </Marker>);
      }) : null}
    />);
  }
  render() {
    const { isLoading, isClustered } = this.state;
    const sessions = this.context.store.getState().get('sessionList');
    return (<div>
      {isLoading ? <LoadingMessage message="Loading sessions" ellipsis /> : this.renderMap(sessions)}
      <div className={styles.options}>
        <p><Checkbox checked={isClustered} onChange={val => this.setState({ isClustered: val })} label="Toggle clustering" /></p>
      </div>
    </div>);
  }
}