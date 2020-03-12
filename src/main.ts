import SlackService from './slack'
import { EventBus } from './events'
import { getEnvOrError } from './utils'
import { SlackServiceController } from './http/controllers/slack'
import { HTTPServer } from './http/server'

async function main() {
    const signingKey = getEnvOrError('SLACK_BOT_SIGNING_KEY')
    const runtimeURL = getEnvOrError('RUNTIME_URL')
    const credsURL = getEnvOrError('CREDS_URL')

    const slack = new SlackService(credsURL, signingKey)
    const eventBus = new EventBus(runtimeURL)
    const slackController = new SlackServiceController(slack, eventBus)

    const server = new HTTPServer(slackController)
    server.install('/slack/events', slack.middlewares)

    await server.start('9003')
}


main().then(() => {
    console.log("🚀 Slack running on :9003!")
}).catch(err => {
    console.error(err)
    process.exit(1)
})
