import { expect, test } from '@playwright/test';
import { GRAFANA_PASSWORD, GRAFANA_URL, GRAFANA_USER, PROMETHEUS_URL } from './support/env';

type PrometheusTargetsResponse = {
  status: string;
  data?: {
    activeTargets?: Array<{
      health?: string;
      labels?: {
        job?: string;
      };
    }>;
  };
};

type GrafanaHealthResponse = {
  database?: string;
};

type GrafanaSearchItem = {
  uid?: string;
};

test('prometheus scrapes go and java targets', async ({ request }) => {
  await expect
    .poll(
      async () => {
        const response = await request.get(`${PROMETHEUS_URL}/api/v1/targets`);
        if (!response.ok()) {
          return { goUp: false, javaUp: false };
        }

        const body = (await response.json()) as PrometheusTargetsResponse;
        if (body.status !== 'success') {
          return { goUp: false, javaUp: false };
        }

        const activeTargets = body.data?.activeTargets ?? [];

        const goUp = activeTargets.some(
          (target) => target.labels?.job === 'api-go' && target.health === 'up'
        );
        const javaUp = activeTargets.some(
          (target) => target.labels?.job === 'api-java' && target.health === 'up'
        );

        return { goUp, javaUp };
      },
      { timeout: 120_000, intervals: [1_000, 1_000, 2_000, 2_000, 5_000] }
    )
    .toEqual({ goUp: true, javaUp: true });
});

test('grafana is healthy and dashboard is provisioned', async ({ request }) => {
  const basicAuth = `Basic ${Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')}`;

  await expect
    .poll(
      async () => {
        const healthResponse = await request.get(`${GRAFANA_URL}/api/health`);
        if (!healthResponse.ok()) {
          return false;
        }

        const healthBody = (await healthResponse.json()) as GrafanaHealthResponse;
        if (healthBody.database !== 'ok') {
          return false;
        }

        const searchResponse = await request.get(
          `${GRAFANA_URL}/api/search?query=Application%20Health%20Overview`,
          {
            headers: { Authorization: basicAuth },
          }
        );
        if (!searchResponse.ok()) {
          return false;
        }

        const dashboards = (await searchResponse.json()) as GrafanaSearchItem[];
        return dashboards.some((dashboard) => dashboard.uid === 'app-health-overview');
      },
      { timeout: 120_000, intervals: [1_000, 1_000, 2_000, 2_000, 5_000] }
    )
    .toBeTruthy();
});
