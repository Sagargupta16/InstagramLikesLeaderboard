// Entry for public/demo.html: mounts the production app against generated data.
import { mountApp } from '../main';
import { DEMO_OWNER_ID, buildDemoFixture } from './fixture';
import { DEMO_POSTS_QUERY, DEMO_REQUEST_POLICY, createDemoFetch } from './mock-instagram';

mountApp(DEMO_OWNER_ID, DEMO_POSTS_QUERY, {
    fetchImpl: createDemoFetch(buildDemoFixture()),
    policy: DEMO_REQUEST_POLICY,
});
