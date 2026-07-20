window.addEventListener('DOMContentLoaded', () => {
  window.ui = SwaggerUIBundle({
    url: '/openapi.yaml',
    dom_id: '#swagger-ui',
    deepLinking: true,
    displayOperationId: false,
    displayRequestDuration: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    filter: true,
    persistAuthorization: false,
    showExtensions: true,
    showCommonExtensions: true,
    supportedSubmitMethods: [],
    syntaxHighlight: { activate: true, theme: 'agate' },
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'BaseLayout'
  });
});
