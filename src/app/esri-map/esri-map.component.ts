/*
  Copyright 2019 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnDestroy
} from "@angular/core";
import { loadModules } from "esri-loader";
import esri = __esri; // Esri TypeScript Types

@Component({
  selector: "app-esri-map",
  templateUrl: "./esri-map.component.html",
  styleUrls: ["./esri-map.component.scss"]
})
export class EsriMapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  // The <div> where we will place the map
  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  /**
   * _zoom sets map zoom
   * _center sets map center
   * _basemap sets type of map
   * _loaded provides map loaded status
   */
  private _zoom = 10;
  private _center: Array<number> = [0.1278, 51.5074];
  private _basemap = "streets-navigation-vector";
  private _loaded = false;
  private _view: esri.MapView = null;

  get mapLoaded(): boolean {
    return this._loaded;
  }

  @Input()
  set zoom(zoom: number) {
    this._zoom = zoom;
  }

  get zoom(): number {
    return this._zoom;
  }

  @Input()
  set center(center: Array<number>) {
    this._center = center;
  }

  get center(): Array<number> {
    return this._center;
  }

  @Input()
  set basemap(basemap: string) {
    this._basemap = basemap;
  }

  get basemap(): string {
    return this._basemap;
  }

  constructor() {}

  createGraphic(point, view, Graphic) {
    // Remove any existing graphics
    view.graphics.removeAll();
    // Create a and add the point
    var graphic = new Graphic({
      geometry: point,
      symbol: {
        type: "simple-marker",
        color: "white",
        size: 8
      }
    });
    view.graphics.add(graphic);
    return graphic;
  }

  createServiceAreaParams(locationGraphic, driveTimeCutoffs, outSpatialReference, FeatureSet, ServiceAreaParams) {
        // Create one or more locations (facilities) to solve for
        var featureSet = new FeatureSet({
          features: [locationGraphic]
        });
        // Set all of the input parameters for the service
        var taskParameters = new ServiceAreaParams({
          facilities: featureSet, // Location(s) to start from
          defaultBreaks: driveTimeCutoffs, // One or more drive time cutoff values
          outSpatialReference: outSpatialReference // Spatial reference to match the view
        });
        return taskParameters;
      }

      executeServiceAreaTask(serviceAreaTask, serviceAreaParams, graphic) {
        return serviceAreaTask.solve(serviceAreaParams)
          .then((result) => {
            if (result.serviceAreaPolygons.length) {
              // Draw each service area polygon
              result.serviceAreaPolygons.forEach((graphic) => {
                graphic.symbol = {
                  type: "simple-fill",
                  color: "rgba(255,50,50,.25)"
                }
                this._view.graphics.add(graphic,0);
              });
            }
          }, (error) => {
            console.log(error);
          });
      }

  async initializeMap() {
    try {
      // Load the modules for the ArcGIS API for JavaScript
      const [EsriMap, EsriSceneView, FeatureLayer, ServiceAreaTask, ServiceAreaParams, FeatureSet, Graphic] = await loadModules([
        "esri/Map",
        "esri/views/SceneView",
        "esri/layers/FeatureLayer",
        "esri/tasks/ServiceAreaTask",
        "esri/tasks/support/ServiceAreaParameters",
        "esri/tasks/support/FeatureSet",
        "esri/Graphic"
      ]);

      // Configure the Map
      const mapProperties: esri.MapProperties = {
        basemap: this._basemap,
        ground: 'world-elevation'
      };

      const map: esri.Map = new EsriMap(mapProperties);

      var trailheadsLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0"
      });

      var trailsLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0"
      });

      var serviceAreaTask = new ServiceAreaTask({
        url: "https://utility.arcgis.com/usrsvcs/appservices/CKaWSDk7AKZMJxnO/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/solveServiceArea"
      });

      map.add(trailheadsLayer);

      map.add(trailsLayer);

      // Initialize the MapView
      const sceneViewProperties: esri.SceneViewProperties = {
        container: this.mapViewEl.nativeElement,
        // center: this._center,
        // zoom: this._zoom,
        // center: [-118.24532,34.05398],
        // zoom: 100,
        environment: {
          // background: {
          //   type: "color",
          //   color: [255, 252, 244, 1]
          // },
          // starsEnabled: true,
          atmosphereEnabled: true,
          atmosphere: {
              quality: 'high'
            },
        },
        map: map,
        camera: {
          position: {  // observation point
            x: -122.6750,
            y: 45.5051,
            z: 250 // altitude in meters
          },
          tilt: 65  // perspective in degrees
        }
      };
// 45.5051° N, 122.6750° W
      this._view = new EsriSceneView(sceneViewProperties);
      await this._view.when();

      this._view.on("click", (event) => {
        var locationGraphic = this.createGraphic(event.mapPoint, this._view, Graphic);
        var driveTimeCutoffs = [10]; // Minutes (default)
        // var serviceAreaParams = this.createServiceAreaParams(locationGraphic, driveTimeCutoffs, this._view.spatialReference, FeatureSet, ServiceAreaParams);
        // this.executeServiceAreaTask(serviceAreaTask, serviceAreaParams, Graphic);
      });

      return this._view;
    } catch (error) {
      console.log("EsriLoader: ", error);
    }
  }

  ngOnInit() {
    // Initialize MapView and return an instance of MapView
    this.initializeMap().then(mapView => {
      // The map has been initialized
      console.log("mapView ready: ", this._view.ready);
      this._loaded = this._view.ready;
      this.mapLoadedEvent.emit(true);
    });
  }

  ngOnDestroy() {
    if (this._view) {
      // destroy the map view
      this._view.container = null;
    }
  }
}
