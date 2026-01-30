import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('🚀 App Started');
    console.log('🌍 Environment:', environment);
    console.log('🔗 API URL:', environment.apiUrl);
  })
  .catch((err) => console.error(err));
