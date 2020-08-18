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
import esri = __esri;

@Component({
  selector: "app-esri-map",
  templateUrl: "./esri-map.component.html",
  styleUrls: ["./esri-map.component.scss"]
})
export class EsriMapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  private _zoom = 10;
  private _center: Array<number> = [0.1278, 51.5074];
  private _basemap = "topo";
  private _loaded = false;
  private _view: esri.SceneView = null;

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
    view.graphics.removeAll();
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
        var featureSet = new FeatureSet({
          features: [locationGraphic]
        });
        var taskParameters = new ServiceAreaParams({
          facilities: featureSet,
          defaultBreaks: driveTimeCutoffs,
          outSpatialReference: outSpatialReference
        });
        return taskParameters;
      }

      executeServiceAreaTask(serviceAreaTask, serviceAreaParams, graphic) {
        return serviceAreaTask.solve(serviceAreaParams)
          .then((result) => {
            if (result.serviceAreaPolygons.length) {
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
      const [EsriMap, EsriSceneView, FeatureLayer, ServiceAreaTask, ServiceAreaParams, FeatureSet, Graphic] = await loadModules([
        "esri/Map",
        "esri/views/SceneView",
        "esri/layers/FeatureLayer",
        "esri/tasks/ServiceAreaTask",
        "esri/tasks/support/ServiceAreaParameters",
        "esri/tasks/support/FeatureSet",
        "esri/Graphic",
      ]);

      const mapProperties: esri.MapProperties = {
        basemap: this._basemap,
        ground: 'world-elevation'
      };

      const map: esri.Map = new EsriMap(mapProperties);

      var trailheadsLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0"
      });

      var trailsLayer = new FeatureLayer({
        url: "https://www.portlandmaps.com/arcgis/rest/services/Public/COP_OpenData_ZoningCode/MapServer/138",

      });


      trailsLayer.renderer = {
        type: "simple",
        symbol: {
          type: "simple-line",
          color: "red",
          width: 2.5
        }
      };

      var serviceAreaTask = new ServiceAreaTask({
        url: "https://utility.arcgis.com/usrsvcs/appservices/CKaWSDk7AKZMJxnO/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/solveServiceArea"
      });

      map.add(trailheadsLayer);

      map.add(trailsLayer);

      const sceneViewProperties: esri.SceneViewProperties = {
        container: this.mapViewEl.nativeElement,
        environment: {
          atmosphereEnabled: true,
          atmosphere: {
              quality: 'high'
            },
        },
        map: map,
        camera: {
          fov: 55,
          heading: 289.25558626846873,
          position: {  // observation point
            latitude: 45.52554549223129,
            longitude: -122.6753007357145,
            z: 1600
          },
          tilt: 0
        }
        // 2D View
        // camera: {
        //   fov: 55,
        //   heading: 256.67540649140903,
        //   position: {
        //     latitude: 45.54176622616609,
        //     longitude: -122.73520013061612,
        //     z: 19500
        //   },
        //   tilt: 0
        // }
      };

      this._view = new EsriSceneView(sceneViewProperties);
      await this._view.when();

      return this._view;
    } catch (error) {
      console.log("EsriLoader: ", error);
    }
  }

  getCamera() {
    var camera = this._view.camera.clone();
    console.log(camera);
  }

  ngOnInit() {
    this.initializeMap().then(mapView => {
      this._loaded = this._view.ready;
      this.mapLoadedEvent.emit(true);
    });
  }

  ngOnDestroy() {
    if (this._view) {
      this._view.container = null;
    }
  }
}
