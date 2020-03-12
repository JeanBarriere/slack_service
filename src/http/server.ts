import { Server } from 'http';
import express, { Application, RequestHandler } from 'express';
import bodyParser from 'body-parser';

interface Controller {
    routes: Map<string, RequestHandler>
}

export class HTTPServer {

    private readonly app: Application;

    constructor(controller: Controller) {
        this.app = express();
        const parser = bodyParser.json()

        for (const [route, handler] of controller.routes) {
            this.app.post(route, parser, handler)
        }
    }

    public install (route: string, handler: RequestHandler) {
        this.app.use(route, handler)
    }

    async start(port: string): Promise<Server> {
        return this.app.listen(port);
    }
}
