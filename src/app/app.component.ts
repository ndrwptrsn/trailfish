import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  mapCenter = [-122.4194, 37.7749];
  basemapType = 'satellite';
  mapZoomLevel = 12;

  title = 'trailfish';
  appType = 'trails';

  mapLoadedEvent(status: boolean) {
    console.log('The map loaded: ' + status);
  }
}
