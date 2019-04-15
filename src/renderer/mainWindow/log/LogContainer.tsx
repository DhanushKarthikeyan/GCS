import { Event, ipcRenderer } from 'electron';
import moment, { Moment } from 'moment';
import React, { Component, FormEvent, ReactNode } from 'react';
import {
  AutoSizer,
  CellMeasurerCache,
  CellMeasurer,
  List,
  ListRowProps,
} from 'react-virtualized';

import {
  isMessageType,
  LogMessage,
  MessageType,
  ThemeProps,
} from '../../../types/types';

import './log.css';

interface State {
  /**
   * The current filter being applied to messages. If the filter is not "", then only messages
   * of the same type as the filter will be shown.
   */
  filter: MessageType;

  /**
   * All messages that have been logged. This includes message that are being hidden
   * if a filter is being applied.
   */
  messages: LogMessage[];

  /**
   * All messages that are being shown. If there's no filter, then this is the same
   * as messages. We have this as it improves performance (prevents having to filter
   * message every time the component is re-rendered) for a space (a duplicate array
   * of messages).
   */
  filteredMessages: LogMessage[];
}

/**
 * Container that displays messages regarding status, error, etc.
 */
export default class LogContainer extends Component<ThemeProps, State> {
  public constructor(props: ThemeProps) {
    super(props);

    this.state = {
      filter: '',
      messages: [],
      filteredMessages: [],
    };

    this.heightCache = new CellMeasurerCache({
      fixedWidth: true,
      minHeight: 20,
    });

    this.rowRenderer = this.rowRenderer.bind(this);
    this.clearMessages = this.clearMessages.bind(this);
    this.updateFilter = this.updateFilter.bind(this);
    this.logMessages = this.logMessages.bind(this);
  }

  public componentDidMount(): void {
    ipcRenderer.on('logMessages', (_: Event, ...messages: LogMessage[]): void => this.logMessages(...messages));
  }

  /**
   * Cache that stores the height for all log messages. Allows the messages to have proper height.
   */
  private heightCache: CellMeasurerCache;

  /**
   * Custom function to render a row in the list.
   */
  private rowRenderer(props: ListRowProps): ReactNode {
    const { filteredMessages } = this.state;
    const {
      index, key, parent, style,
    } = props;
    const message = filteredMessages[index];

    return (
      <CellMeasurer
        cache={this.heightCache}
        columnIndex={0}
        key={key}
        rowIndex={index}
        parent={parent}
      >
        <div className="row" style={style}>
          <div className="time">{(message.time as Moment).format('HH:mm:ss.SSS')}</div>
          <div className={`message ${message.type}`}>{message.message}</div>
        </div>
      </CellMeasurer>
    );
  }

  /**
   * Clears all the messages in the log.
   */
  private clearMessages(): void {
    this.heightCache.clearAll();

    this.setState({
      filter: '',
      messages: [],
      filteredMessages: [],
    });
  }

  /**
   * Changes the filter applied to the log.
   */
  private updateFilter(event: FormEvent<HTMLSelectElement>): void {
    const { messages } = this.state;

    this.heightCache.clearAll();
    const newFilter = event.currentTarget.value;

    // Ensures our new value has a type of MessageType.
    if ((!newFilter && newFilter !== '') || !isMessageType(newFilter)) return;

    this.setState({
      filter: newFilter as MessageType,
      filteredMessages: newFilter === '' ? messages.slice(0) : messages.filter((message): boolean => message.type === newFilter),
    });
  }

  /**
   * Updates the messages in the log. Will update filtered messages accordingly.
   */
  private logMessages(...messages: LogMessage[]): void {
    const { filteredMessages, messages: thisMessages, filter } = this.state;
    const currentMessages = thisMessages;
    const currentFilteredMessages = filteredMessages;

    messages.forEach((message): void => {
      const msg: LogMessage = {
        type: message.type || '',
        message: message.message,
        time: message.time || moment(),
      };

      if (filter === '' || msg.type === filter) {
        currentFilteredMessages.push(msg);
      }
      currentMessages.push(msg);
    });

    this.setState({
      messages: currentMessages,
      filteredMessages: currentFilteredMessages,
    });
  }

  public render(): ReactNode {
    const { theme } = this.props;
    const { filter, filteredMessages } = this.state;

    return (
      <div className={`logContainer container${theme === 'dark' ? '_dark' : ''}`}>
        <div className={`messages${theme === 'dark' ? '_dark' : ''}`}>
          <AutoSizer>
            {({ height, width }): ReactNode => (
              <List
                deferredMeasurementCache={this.heightCache}
                height={height}
                width={width}
                overscanRowCount={0}
                rowCount={filteredMessages.length}
                rowHeight={this.heightCache.rowHeight}
                rowRenderer={this.rowRenderer}
                scrollToIndex={filteredMessages.length - 1}
              />
            )}
          </AutoSizer>
        </div>
        <div className="control">
          <select onChange={this.updateFilter} value={filter}>
            <option value="">No Filter</option>
            <option className="success" value="success">Success</option>
            <option className="progress" value="progress">Progress</option>
            <option className="failure" value="failure">Failure</option>
          </select>
          <button type="button" onClick={this.clearMessages}>Clear Log</button>
        </div>
      </div>
    );
  }
}