const { createProxyMiddleware } = require('http-proxy-middleware');

const axinomApiUrl = "https://vip-eu-west-1.axinom.com";
const axinomAccessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ikl5V0ozTWFzY1RIWklnblQ1NGdxeGlocDRuR3RKSTlXUnR3cWNwNV8xU3cifQ.eyJ0ZW5hbnRJZCI6ImU2MmQ5ZGI4LTBlODAtNGE5Mi04Zjk0LWQyOWE3MDNiOTAyNCIsImVudmlyb25tZW50SWQiOiJkOGU3NGYyMC00Nzg1LTQyZjctODhiNS1lOTFmMWVmOThkMjYiLCJuYW1lIjoiZGV2LXNlcnZpY2UtYWNjb3VudCIsInBlcm1pc3Npb25zIjp7ImF4LXZpZGVvLXNlcnZpY2UiOlsiVklERU9TX0VOQ09ERSIsIlZJREVPU19WSUVXIiwiQURNSU4iXSwiYXgtaWQtc2VydmljZSI6WyJERVZfQUNDRVNTX1RPS0VOU19HRU5FUkFURV9XSVRIX1BFUk1JU1NJT05TIiwiREVWX1NFUlZJQ0VfQUNDT1VOVFNfU0VUVVBfV0lUSF9QRVJNSVNTSU9OUyJdLCJheC1lbmNvZGluZy1zZXJ2aWNlIjpbIlZJREVPU19FTkNPREUiLCJWSURFT1NfVklFVyIsIkFETUlOIl19LCJzdWJqZWN0VHlwZSI6IlNlcnZpY2VBY2NvdW50IiwiaWF0IjoxNzMzNzQ4Nzg3LCJleHAiOjE3MzM3NTIzODcsImF1ZCI6IioiLCJpc3MiOiJheC1pZC1zZXJ2aWNlIiwic3ViIjoiNWY2NjdmOTItYzc1OS00ZmFhLWI5NWUtNmU3NGUzNjExMDRkIn0.oDAdDhZlRbzXnzI7zymJeabM6-JufCnREvpXu8XAM2JnrXHBs1PfxOf0U0VYQeQ34FuRNy7a-AUgul47-jTQ0xH5DFmmOW_9ZN2BT8P9HzWqdL4Kgj-jHX9suFyFTJRVkddk8Uy5yi19vdyP_l_0MBHIQAO2QCjGgxg2sHAJhrtJM7LAUxntiXeTiB0Uc1sw3DRf6jSR_w6RIS0vgLMA1IjC02zK25jQrwgXHuBOY2VMSR1FeYf9-ptvnTOr2mUaCvZtBJtizYTAjCv2V89o5vwFswHnjn2kBNRuvZGW58VOKEeO3BoVi3mL9PwjuUgX_6IJ_GB9j_CE2x4BynpkGyvKbc-fOEpKTIG0i1kYcu_V5U8aUaQBVn1zXpifPDPPk9k0UD67jqAYLkD5n7fFdMyKjtqkyJjvjOSAjzZHyBIvCTQDyvds7hreIy7tQYVVkITnKy4hm2dsnmA-MJ7Xx22idFURgjYqxS0scwLpDf90sd-WOSVJxwy_hM0Lytg13GxeQ_aWPtIrcfg6gnicxOKiPqh0JXF1G4AUUE3oJB0GhwhrNAZ4qlqdNoHPdJzrrfjPRsPwU_ajGH2zv7Zr_oqC590Cf8RKI5P7UlOYHW3iw8hakWKvTFTOQPZWkW0NWuftAkgCDjN9hLRbvNwGMgKroB2tsr254rZW7cjGAIE";

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
        target: axinomApiUrl,
        changeOrigin: true,
        pathRewrite: { '^/api': '' }, // Removes /api prefix when proxying
        onProxyReq: (proxyReq, req) => {
          // Add headers
          proxyReq.setHeader('Authorization', `Bearer ${axinomAccessToken}`);
          proxyReq.setHeader('Content-Type', `"application/json"`);
          proxyReq.setHeader('Accept', `"application/json"`);
        },
    })
  );
};
