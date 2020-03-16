import { WebClient } from '@slack/web-api'
import { createEventAdapter } from '@slack/events-api'
import SlackEventAdapter from '@slack/events-api/dist/adapter'
import { RequestHandler, Application } from 'express'
import axios from 'axios'

export interface MessageEvent {
  type: string
  subtype?: string
  channel: string
  user: string
  text: string
  ts: string
  edited?: { user: string, ts: string }
}

export interface MessageListener {
  subscriptionID: string
  channel?: string
  mention?: boolean
  pattern: RegExp
}

class MessageEventSet<T extends MessageEvent> extends Set<T> {

  public find (eventID: string): T & MessageEvent | null {
    for (const item of this.values()) {
      if (item.ts === eventID) {
        return item
      }
    }
    return null
  }

  public findIndex (eventID: string): T & MessageEvent | null {
    for (const item of this.values()) {
      if (item.ts === eventID) {
        return item
      }
    }
    return null
  }

  public has (item: T & MessageEvent): boolean {
    return !!this.find(item.ts)
  }

  public get (eventID: string): T & MessageEvent | null {
    return this.find(eventID)
  }
}

export default class SlackService {
  private readonly _eventsAdapter: SlackEventAdapter
  private readonly _credsURL: string
  private _events: MessageEventSet<MessageEvent>
  private _listeners: MessageListener[] = []

  constructor(credsURL: string, signingKey: string) {
    this._eventsAdapter = createEventAdapter(signingKey)
    this._credsURL = credsURL
    this._events = new MessageEventSet()
  }

  private async webClient (appID: string): Promise<WebClient> {
    const token = await axios.get(`${this._credsURL}/creds?appID=${appID}&integration=slack`).then(res => res.data.access_token).catch(() => '')
    return new WebClient(token)
  }

  private _onSubscription: (listener: MessageListener, event: MessageEvent) => void = (_l, _e) => {}

  public set onSubscription (callback: (listener: MessageListener, event: MessageEvent) => void) {
    this._onSubscription = callback
  }

  private getListenerForEvent (event: MessageEvent): MessageListener | null {
    for (const listener of this._listeners) {
      if ((event.type === 'app_mention' && listener.mention && listener.pattern.test(event.text)) ||
          (event.type === 'message' && (!event.subtype || event.subtype === '') && listener.channel === event.channel && listener.pattern.test(event.text))) {
        return listener
      }
    }
    return null
  }

  private trigger (event: MessageEvent) {
    const listener = this.getListenerForEvent(event)
    if (listener) {
      this._events.add(event)
      this._onSubscription(listener, event)
    }
  }

  public async addMessageListener (appID: string, subscriptionID: string, channelName: string, pattern: string): Promise<void> {
    const webClient = await this.webClient(appID)
    const channel = await this.channelNameToChannelID(webClient, channelName)

    if (channel) {
      const channelInfos = (await webClient.conversations.info({ channel })).channel as { is_member: boolean }
      if (!channelInfos.is_member) {
        webClient.conversations.join({ channel })
      }
      const listener: MessageListener = { subscriptionID, channel, pattern: new RegExp(pattern) }
      this._listeners.push(listener)
    }
  }

  public removeMessageListener(subscriptionID: string) {
    const index = this._listeners.findIndex(l => l.subscriptionID === subscriptionID)
    if (index >= 0) {
      this._listeners.splice(index, 1)
    }
  }

  public async addMentionListener (appID: string, subscriptionID: string, pattern: string): Promise<void> {
    const listener: MessageListener = { subscriptionID, mention: true, pattern: new RegExp(pattern) }
    this._listeners.push(listener)
  }

  public removeMentionListener(subscriptionID: string) {
    const index = this._listeners.findIndex(l => l.subscriptionID === subscriptionID)
    if (index >= 0) {
      this._listeners.splice(index, 1)
    }
  }

  public removeEvent(eventID: string): boolean {
    const event = this._events.find(eventID)
    if (event) {
      return this._events.delete(event)
    }
    return false
  }

  public async sendMessage (appID: string, channelName: string, text: string): Promise<boolean> {
    const webClient = await this.webClient(appID)
    const channel = await this.channelNameToChannelID(webClient, channelName)

    if (channel) {
      const res = await webClient.chat.postMessage({ channel, text })
      return res.ok
    }

    return false
  }

  public async reply (appID: string, eventID: string, text: string): Promise<boolean> {
    const webClient = await this.webClient(appID)
    const event = this._events.find(eventID)
    if (event) {
      const res = await webClient.chat.postMessage({ channel: event.channel, thread_ts: event.ts, text })
      return res.ok
    }
    return false
  }

  private async channelNameToChannelID (webClient: WebClient, channel: string): Promise<string | null> {
    const isUser = channel.startsWith('@')
    const name = channel.slice(1)
    if (isUser) {
      const users = ((await webClient.users.list()).members as { id: string, name: string }[])
      for (const user of users) {
        if (user.name === name) {
          return user.id
        }
      }
    } else {
      const channels = ((await webClient.channels.list()).channels as { id: string, name: string }[])
      for (const channel of channels) {
        if (channel.name === name) {
          return channel.id
        }
      }
    }
    return null
  }

  public watch (): void {
    this._eventsAdapter.on('message', async (event: MessageEvent) => { this.trigger(event) })
    this._eventsAdapter.on('app_mention', async (event: MessageEvent) => { this.trigger(event) })
  }

  public get middlewares(): RequestHandler {
    return this._eventsAdapter.expressMiddleware()
  }
}
