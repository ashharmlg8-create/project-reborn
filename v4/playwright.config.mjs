import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests",testMatch:"*.spec.mjs",timeout:30000,fullyParallel:false,
 use:{baseURL:"http://127.0.0.1:8187",trace:"retain-on-failure"},
 webServer:{command:"python -m http.server 8187 --bind 127.0.0.1",url:"http://127.0.0.1:8187/",reuseExistingServer:!process.env.CI},
 projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}]
});