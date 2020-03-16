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

export class MessageEventSet<T extends MessageEvent> extends Set<T> {

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
