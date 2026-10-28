/**
 * OpenTelemetry bootstrap.
 *
 * IMPORTANT: This file MUST be imported BEFORE anything else in main.ts
 * (i.e., before NestFactory, before any business module). OTel auto-
 * instrumentation works by patching Node's `require`/`import` cache,
 * so it must run first to wrap libraries (http, pg, ioredis, nestjs, etc.).
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME || 'nest-backend';
const exporterUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.0.1',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({ url: exporterUrl }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Reduce noise from filesystem traces
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

// Standard OTel switch: set OTEL_SDK_DISABLED=true to run without tracing
// (e.g. locally when no collector is running, or in unit tests).
const disabled = process.env.OTEL_SDK_DISABLED === 'true';

if (!disabled) {
  try {
    sdk.start();
    // eslint-disable-next-line no-console
    console.log(`[OTel] Tracing initialized → ${exporterUrl} (service=${serviceName})`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[OTel] Failed to start tracing', err);
  }
}

/**
 * Flush pending spans. Called from AppModule.onApplicationShutdown so it runs
 * inside Nest's shutdown sequence (a raw SIGTERM listener here would stop
 * Nest's own shutdown hooks from terminating the process).
 */
export async function shutdownTracing(): Promise<void> {
  if (disabled) return;
  await sdk.shutdown().catch(() => undefined);
}
