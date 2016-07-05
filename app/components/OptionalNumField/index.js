import React from 'react';

import styles from './styles.css';

export default class OptionalNumField extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    name: React.PropTypes.string.isRequired,
    id: React.PropTypes.string,
    onChange: React.PropTypes.func,
    value: React.PropTypes.string,
  }
  constructor(props) {
    super(props);
    this.state = {
      value: props.value || 0,
      bool: props.value ? true : false, // eslint-disable-line no-unneeded-ternary
      initialized: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.radioClick = this.radioClick.bind(this);
  }
  componentWillReceiveProps(nextProps) {
    const newState = { value: nextProps.value };
    if (!this.state.initialized) {
      newState.bool = !!nextProps.value;
    }
    this.setState(newState);
  }
  handleChange(event) {
    const value = event.target.value;
    this.setState({ initialized: true, value });
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  }
  radioClick(event) {
    const bool = event.target.value === 't';
    this.setState({ initialized: true, bool });
    if (this.props.onChange && bool === false) {
      this.props.onChange(bool ? this.state.value : 0);
    }
  }
  render() {
    const { name } = this.props;
    const { value, bool } = this.state;
    const attrs = {
      className: styles.inputField,
      type: 'number',
      name,
      value,
      onChange: this.handleChange
    };
    let numberInput = null;
    if (bool) {
      numberInput = <input {...attrs} autoFocus />;
    }
    const radioAttrs = {
      id: `${name}_optionalNumField`,
      type: 'radio',
      onChange: this.radioClick
    };
    return (<div className={styles.optionalNum}>
      <label>
        <input {...radioAttrs} value="0" checked={!bool} /> No
      </label>
      <label>
        <input {...radioAttrs} value="t" checked={bool} /> Yes
      </label>
      <label>
        {numberInput}
      </label>
    </div>);
  }
}