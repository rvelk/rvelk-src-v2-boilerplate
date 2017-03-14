import React from 'react'; // jshint ignore:line
import Form from 'misago/components/form';
import FormGroup from 'misago/components/form-group'; // jshint ignore:line
import CategorySelect from 'misago/components/category-select'; // jshint ignore:line
import ModalLoader from 'misago/components/modal-loader'; // jshint ignore:line
import * as posts from 'misago/reducers/posts';
import * as thread from 'misago/reducers/thread';
import misago from 'misago'; // jshint ignore:line
import ajax from 'misago/services/ajax'; // jshint ignore:line
import modal from 'misago/services/modal'; // jshint ignore:line
import snackbar from 'misago/services/snackbar';
import store from 'misago/services/store'; // jshint ignore:line

export default class extends Form {
  constructor(props) {
    super(props);

    this.state = {
      isReady: false,
      isLoading: false,
      isError: false,

      category: null,
      categories: [],
    };
  }

  componentDidMount() {
    ajax.get(misago.get('THREAD_EDITOR_API')).then((data) => {
      let category = null;

      // hydrate categories, extract posting options
      const categories = data.map((item) => {
        // pick first category that allows posting and if it may, override it with initial one
        if (item.post !== false && !category) {
          category = item.id;
        }

        return Object.assign(item, {
          disabled: item.post === false,
          label: item.name,
          value: item.id
        });
      });

      this.setState({
        isReady: true,

        category,
        categories
      });
    }, (rejection) => {
      this.setState({
        isError: rejection.detail
      });
    });
  }

  send() {
    // freeze thread
    store.dispatch(thread.busy());

    return ajax.patch(this.props.thread.api.index, [
      {op: 'replace', path: 'category', value: this.state.category},
    ]);
  }

  handleSuccess() {
    // refresh thread and displayed posts
    ajax.get(this.props.thread.api.posts.index, {page: this.props.posts.page}).then((data) => {
      store.dispatch(thread.replace(data));
      store.dispatch(posts.load(data.post_set));
      store.dispatch(thread.release());

      snackbar.success(gettext("Thread has been moved."));
      modal.hide();
    }, (rejection) => {
      store.dispatch(thread.release());
      snackbar.apiError(rejection);
    });
  }

  handleError(rejection) {
    if (rejection.status === 400) {
      snackbar.error(rejection.detail[0]);
    } else {
      snackbar.apiError(rejection);
    }
  }

  /* jshint ignore:start */
  onCategoryChange = (event) => {
    this.changeValue('category', event.target.value);
  };
  /* jshint ignore:end */

  render() {
    /* jshint ignore:start */
    if (this.state.isReady) {
      return (
        <div className="modal-dialog" role="document">
          <form onSubmit={this.handleSubmit}>
            <div className="modal-content">
              <ModalHeader />
              <div className="modal-body">
                <FormGroup for="id_category" label={gettext("New category")}>
                  <CategorySelect
                    choices={this.state.categories}
                    disabled={this.state.isLoading || this.props.thread.isBusy}
                    id="id_category"
                    onChange={this.onCategoryChange}
                    value={this.state.category}
                  />
                </FormGroup>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" loading={this.state.isLoading || this.props.thread.isBusy}>
                  {gettext("Move thread")}
                </button>
              </div>
            </div>
          </form>
        </div>
      );
    } else if (this.state.isError) {
      return (
        <ModalMessage message={this.state.isError} />
      );
    } else {
      return (
        <ModalLoading />
      );
    }
    /* jshint ignore:end */
  }
}

/* jshint ignore:start */
export function ModalHeader(props) {
  return (
    <div className="modal-header">
      <button
        aria-label={gettext("Close")}
        className="close"
        data-dismiss="modal"
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <h4 className="modal-title">{gettext("Move thread")}</h4>
    </div>
  );
}

export function ModalLoading(props) {
  return (
    <div className="modal-dialog" role="document">
      <div className="modal-content">
        <ModalHeader />
        <ModalLoader />
      </div>
    </div>
  );
}

export function ModalMessage(props) {
  return (
    <div className="modal-dialog modal-message" role="document">
      <div className="modal-content">
        <ModalHeader />
        <div className="message-icon">
          <span className="material-icon">
            info_outline
          </span>
        </div>
        <div className="message-body">
          <p className="lead">
            {gettext("You can't move this thread at the moment.")}
          </p>
          <p>
            {props.message}
          </p>
        </div>
      </div>
    </div>
  );
}
/* jshint ignore:end */
