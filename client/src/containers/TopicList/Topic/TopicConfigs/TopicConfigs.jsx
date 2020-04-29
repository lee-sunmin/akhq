import React, { Component } from 'react';
import Header from '../../../Header/Header';
import { get, post } from '../../../../utils/api';
import { uriTopicsConfigs, uriTopicsUpdateConfigs } from '../../../../utils/endpoints';
import Table from '../../../../components/Table';
import Form from '../../../../components/Form/Form';
import converters from '../../../../utils/converters';
import _ from 'lodash';
import Joi from 'joi-browser';
import { MILLI, BYTES, TEXT } from '../../../../utils/constants';

class TopicConfigs extends Form {
  state = {
    host: '',
    port: '',
    data: [],
    selectedCluster: this.props.clusterId,
    selectedTopic: this.props.topicId,
    formData: {},
    changedConfigs: {},
    errors: {},
    configs: []
  };

  schema = {};

  componentDidMount() {
    this.getTopicsConfig();
  }

  async getTopicsConfig() {
    let configs = [];
    const { selectedCluster, selectedTopic } = this.state;
    const { history } = this.props;
    history.replace({
      loading: true
    });
    try {
      configs = await get(uriTopicsConfigs(selectedCluster, selectedTopic));
      this.handleData(configs.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      history.replace({
        loading: false
      });
    }
  }

  handleData(configs) {
    configs.map(config => {
      this.createValidationSchema(config);
    });

    let tableTopics = configs.map(config => {
      return {
        id: config.name,
        name: config.name,
        description: config.description,
        value: config.value,
        readOnly: config.readOnly,
        dataType: this.getConfigDataType(config.name),
        type: config.source,
        sensitive: config.sensitive
      };
    });
    this.setState({ data: tableTopics, configs });
  }
  getConfigDataType = configName => {
    switch (configName.substring(configName.lastIndexOf('.'))) {
      case '.ms':
        return MILLI;
      case '.size':
        return BYTES;
      default:
        return TEXT;
    }
  };
  handleDataType(dataType, value) {
    switch (dataType) {
      case 'MILLI':
        return (
          <small className="humanize form-text text-muted">{converters.showTime(value)}</small>
        );
      case 'BYTES':
        return (
          <small className="humanize form-text text-muted">{converters.showBytes(value)}</small>
        );
    }
  }

  createValidationSchema(config) {
    let { formData } = this.state;
    let validation;
    if (isNaN(config.value)) {
      validation = Joi.any();
    } else {
      validation = Joi.any();
    }
    this.schema[config.name] = validation;

    formData[config.name] = isNaN(+config.value) ? config.value : +config.value;
    this.setState({ formData });
  }

  onChange({ currentTarget: input }) {
    let { data, configs } = this.state;
    let config = {};
    let newData = data.map(row => {
      if (row.id === input.name) {
        config = configs.find(config => config.name === input.name);
        let { formData, changedConfigs } = this.state;
        formData[input.name] = input.value;
        if (input.value === config.value) {
          delete changedConfigs[input.name];
        } else {
          changedConfigs[input.name] = input.value;
        }

        this.setState({ formData, changedConfigs });
        return {
          id: config.name,
          name: config.name,
          description: config.description,
          value: config.value,
          readOnly: config.readOnly,
          dataType: this.getConfigDataType(config.name),
          type: config.source,
          sensitive: config.sensitive
        };
      }
      return row;
    });

    this.setState({ data: newData });
  }

  async doSubmit() {
    const { selectedCluster, selectedTopic, changedConfigs } = this.state;
    const { history, location } = this.props;
    history.replace({
      loading: true
    });
    try {
      await post(uriTopicsUpdateConfigs(selectedCluster, selectedTopic), {
        clusterId: selectedCluster,
        topicId: selectedTopic,
        configs: changedConfigs
      });

      this.setState({ state: this.state }, () =>
        this.props.history.replace({
          showSuccessToast: true,
          successToastMessage: `Node '${selectedTopic}' was updated successfully.`,
          loading: false
        })
      );
    } catch (err) {
      this.props.history.replace({
        showErrorToast: true,
        errorToastTitle: err.response.data.title,
        errorToastMessage: err.response.data.description,
        loading: false
      });
      console.error('Error:', err.response);
    }
  }

  getInput(value, name, readOnly, dataType) {
    return (
      <div>
        {dataType === 'TEXT' ? (
          <input
            type="text"
            onChange={value => this.onChange(value)}
            className="form-control"
            autoComplete="off"
            value={value}
            name={name}
            placeholder="default"
          />
        ) : (
          <input
            type="number"
            onChange={value => this.onChange(value)}
            className="form-control"
            autoComplete="off"
            value={value}
            name={name}
            placeholder="default"
          />
        )}
        {this.handleDataType(dataType, value)}
      </div>
    );
  }

  handleTypeAndSensitive(configType, configSensitive) {
    const type = configType === 'DEFAULT_CONFIG' ? 'secondary' : 'warning';
    return (
      <div>
        <span className={'badge badge-' + type}> {configType}</span>
        {configSensitive ? (
          <i className="sensitive fa fa-exclamation-triangle text-danger" aria-hidden="true"></i>
        ) : (
          ''
        )}
      </div>
    );
  }

  handleNameAndDescription(name, description) {
    const descript = description ? (
      <a className="text-secondary" data-toggle="tooltip" title={description}>
        <i className="fa fa-question-circle" aria-hidden="true"></i>
      </a>
    ) : (
      ''
    );
    return (
      <div className="name-color">
        {name} {descript}
      </div>
    );
  }

  renderTabs(tabName, isActive) {
    const active = isActive ? 'active' : '';
    return (
      <li className="nav-item">
        <a className={`nav-link ${active}`} href="#" role="tab">
          {tabName}
        </a>
      </li>
    );
  }

  render() {
    const { data, selectedTopic, selectedCluster } = this.state;
    return (
      <form
        encType="multipart/form-data"
        className="khq-form mb-0"
        onSubmit={() => this.handleSubmit()}
      >
        <div>
          <Table
            columns={[
              {
                id: 'nameAndDescription',
                accessor: 'nameAndDescription',
                colName: 'Name',
                type: 'text',
                cell: obj => {
                  return this.handleNameAndDescription(obj.name, obj.description);
                }
              },
              {
                id: 'value',
                accessor: 'value',
                colName: 'Value',
                type: 'text',
                cell: obj => {
                  return this.getInput(
                    this.state.formData[obj.name],
                    obj.name,
                    obj.readOnly,
                    obj.dataType
                  );
                }
              },
              {
                id: 'typeAndSensitive',
                accessor: 'typeAndSensitive',
                colName: 'Type',
                type: 'text',
                cell: obj => {
                  return this.handleTypeAndSensitive(obj.type, obj.sensitive);
                }
              }
            ]}
            data={data}
          />

          <aside>
            {this.renderButton('Update configs', this.handleSubmit, undefined, 'submit')}
          </aside>
        </div>
      </form>
    );
  }
}

export default TopicConfigs;
