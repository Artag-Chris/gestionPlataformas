/**
 * Contratos RabbitMQ del microservicio Slack.
 */

export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  SLACK_SEND: 'channels.slack.send',
  SLACK_RESPONSE: 'channels.slack.response',
} as const;

export const QUEUES = {
  SLACK_SEND: 'slack.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
