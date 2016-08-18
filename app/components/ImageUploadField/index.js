import React, { PropTypes } from 'react';
import { apiModel } from 'utils/api';

import styles from './styles.css';

export default class ImageUploadField extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    uploadURL: PropTypes.string
  }
  handleChange = (event) => {
    event.stopPropagation();
    event.preventDefault();
    const { files } = event.target;
    const file = files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file, file.name);
      this.setState({ status: 'Uploading...' });
      apiModel.upload(this.props.uploadURL, formData).then(data => {
        this.setState({ status: '' });
        const { instance } = data;
        if (this.props.onChange) this.props.onChange(instance.image);
      }).catch(error => {
        this.setState({ status: '' });
        console.error(error);
      });
    }
  }
  render() {
    const { value } = this.props;
    return (<div className={`${styles.imageField} ${this.state && this.state.status === 'Uploading...' ? styles.loading : ''}`}>
      <img src={value ? `${value}?${Date.now()}` : '/images/placeholder.png'} role="presentation" />
      <input type="file" onChange={this.handleChange} />
      {this.state ? this.state.status : ''}
    </div>);
  }
}