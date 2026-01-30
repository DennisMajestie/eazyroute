import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('🚀 App Started');
    console.log('🌍 Environment:', environment);
    console.log('🔗 API URL:', environment.apiUrl);
  })
  .catch((err: any) => console.error(err));
