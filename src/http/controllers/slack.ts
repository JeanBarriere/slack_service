import { RequestHandler, Request, Response } from "express"
import { EventBus } from "src/events"
import SlackService, { MessageListener, MessageEvent } from "src/slack"

export class SlackServiceController {
  private readonly _bus: EventBus
  private readonly _service: SlackService

  constructor (service: SlackService, eventBus: EventBus) {
    this._bus = eventBus
    this._service = service
    this._service.onSubscription = this.onHears.bind(this)
    this._service.watch()
  }

  public get routes (): Map<string, RequestHandler> {
    const routes = new Map<string, RequestHandler>();

    routes.set('/hears', async (req, res) => this.hears(req, res))
    routes.set('/unhears', async (req, res) => this.unhears(req, res))
    routes.set('/hears/reply', async (req, res) => this.hears_reply(req, res))
    routes.set('/hears/close', async (req, res) => this.hears_close(req, res))
    routes.set('/send', async (req, res) => this.send(req, res))

    return routes;
  }

  private onHears (listener: MessageListener, event: MessageEvent): void {
    this._bus.submit(listener.subscriptionID, event.ts, event)
  }

  public async hears(req: Request, res: Response): Promise<void> {
    const appID = req.body.appID as string
    const subscriptionID = req.body.subscriptionID as string
    const pattern = req.body.pattern as string
    const channel = req.body.channel as string

    await this._service.addMessageListener(appID, subscriptionID, channel, pattern)

    res.sendStatus(200);
  }

  public async unhears(req: Request, res: Response): Promise<void> {
    const subscriptionID = req.body.subscriptionID as string

    await this._service.removeMessageListener(subscriptionID)

    res.sendStatus(200);
  }

  public async hears_reply(req: Request, res: Response): Promise<void> {
    const appID = req.body.appID as string
    const eventID = req.body.eventID as string
    const text = req.body.text as string

    await this._service.reply(appID, eventID, text)

    res.sendStatus(200);
  }

  public async hears_close(req: Request, res: Response): Promise<void> {
    const eventID = req.body.eventID as string

    await this._service.removeEvent(eventID)

    res.sendStatus(200);
  }

  public async send(req: Request, res: Response): Promise<void> {
    const appID = req.body.appID as string
    const channel = req.body.channel as string
    const text = req.body.text as string

    await this._service.sendMessage(appID, channel, text)

    res.sendStatus(200);
  }
}