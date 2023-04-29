/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useRef,
  useEffect,
  useState,
  MutableRefObject,
  useCallback,
} from "react";

import ReactDOMServer from "react-dom/server";
import axios from "axios";
import MapView from "@arcgis/core/views/MapView";
import WebMap from "@arcgis/core/WebMap";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import FeatureTable from "@arcgis/core/widgets/FeatureTable";
import Graphic from "@arcgis/core/Graphic";
import LayerList from "@arcgis/core/widgets/LayerList";
import Expand from "@arcgis/core/widgets/Expand";
import Search from "@arcgis/core/widgets/Search";
import LayerSearchSource from "@arcgis/core/widgets/Search/LayerSearchSource";
import Sketch from "@arcgis/core/widgets/Sketch";
import "@esri/calcite-components/dist/calcite/calcite.css";
import {
  Grid,
  GridItem,
  Button as WaveButton,
  Flex,
  FormField,
  TextInput,
  ContentBlock,
  AutoGrid,
  Select,
  DataList,
  Label,
  Text,
  Spinner,
  Box,
  SvgIcon,
} from "@volue/wave-react";
import MapInitProps, {
  DefaultSrs,
  FireFlowResultLayerFields,
  LayerConfig,
  PolygonSymbol,
  PolylineSymbol,
  SelectedSymbol,
  CustomSimpleRenderer,
  UniqueValueInfos,
} from "../interfaces/mapinterface";
import {
  PipePayLoad,
  FireFlowSimulationRequest,
  FireFlowSimulationData,
} from "../interfaces/apiinterfaces";

import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import { white } from "color-name";
import ReactDOM from "react-dom";

const GisMap: React.FC<MapInitProps> = ({ portalUrl, webMapId, modelId }) => {
  const [processFireFlowInProgress, setProcessFireFlowInProgress] =
    useState<boolean>(false);
  const [vannledningStatusValue, setVannledningStatusValue] = useState("OPEN");
  const [editedPipes, setEditedPipes] = useState<PipePayLoad[]>([]);
  const [sketchGeometry, setSketechGeometry] = useState<__esri.Geometry>();
  const [featureLayerView, setFeatureLayerView] = useState<FeatureLayerView>();

  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView>();
  const modifiedFeaturesContainer = useRef<HTMLDivElement>(null);
  const editPipePopup = useRef<HTMLDivElement>(null);
  const diameterRef = useRef<HTMLInputElement>(null);
  const vannledningStatusRef = useRef<HTMLSelectElement>(null);
  const runAnalysisPopupContainerRef = useRef<HTMLInputElement>(null);
  const [showEditPipePopup, setShowEditPipePopup] = useState<boolean>(false);
  const [showRunAnalysisPopup, setShowRunAnalysisPopup] =
    useState<boolean>(false);
  const [pipeDiameter, setPipeDiameter] = useState<string | undefined>();

  const [analysisType, setAnalysisType] = useState<string>("Q4P");
  const [pressure, setPressure] = useState<number>(10);
  const [day, setDay] = useState<number>(0);
  const [time, setTime] = useState<string>("17:00");

  const analysisTypeOptions = [
    { value: "Q4P", label: "Slokkevannskapasitet" },
    { value: "P4Q", label: "Rest trykk ved angitt vannuttak" },
    { value: "Q-H", label: "Hydrant Q-H kurve ventil 1" },
  ];

  const dayOptions = [
    { value: "0", label: "Mandag" },
    { value: "1", label: "Tirsdag" },
    { value: "2", label: "Onsdag" },
    { value: "3", label: "Torsdag" },
    { value: "4", label: "Fredag" },
    { value: "5", label: "Lørdag" },
    { value: "6", label: "Søndag" },
  ];

  const handleAnalysisTypeChange = (
    value: string,
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setAnalysisType(value);
  };

  const handlePressureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPressure(Number(event.target.value));
  };

  const handleDayChange = (
    value: string,
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setDay(Number(value));
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
  };

  const drawingGraphicsLayer = new GraphicsLayer();

  let featureTable: FeatureTable;
  const SelectedFeatures: PipePayLoad[] = [];

  const [FireFlowGraphics] = useState<Graphic[]>([]);
  const FireFlowResultsRenderer = {
    type: "unique-value",
    field: "ObjectType",
    field2: "FireFlowCapacityClass",

    fieldDelimiter: " | ",
    uniqueValueInfos: UniqueValueInfos,
    authoringInfo: {},
  };

  const runAnalysisPopup = new Expand({
    content: runAnalysisPopupContainerRef.current!,
    expandIconClass: "esri-icon-play",
    expanded: false,
    collapseTooltip: "Run Analysis Base on Edited Data",
    expandTooltip: "Run Analysis Base on Edited Data",
  });

  const expandModifiedFeatures = new Expand({
    content: modifiedFeaturesContainer.current!,
    expandIconClass: "esri-icon-documentation",
    expanded: false,
    collapseTooltip: "Review Changes",
    expandTooltip: "Review Changes",
  });

  const PopUpContentFireFlowBatch = (feature: any) => {
    console.log(feature);
    const div = document.createElement("div");
    let query = FireFlowResultsLayer.createQuery();
    query.where = `ObjectID=${feature.graphic.attributes.ObjectID}`;
    query.outFields = ["*"];
    FireFlowResultsLayer.queryFeatures(query).then(function (response) {
      console.log(response);
      div.innerHTML = ReactDOMServer.renderToStaticMarkup(
        <DataList striped>
          <DataList.Row>
            <DataList.Label>FireFlow</DataList.Label>
            <DataList.Value>
              {response.features[0].attributes.FireFlow}
            </DataList.Value>
          </DataList.Row>
          <DataList.Row>
            <DataList.Label>StaticPressure</DataList.Label>
            <DataList.Value>
              {response.features[0].attributes.StaticPressure}
            </DataList.Value>
          </DataList.Row>
          <DataList.Row>
            <DataList.Label>StaticDemand</DataList.Label>
            <DataList.Value>
              {response.features[0].attributes.StaticDemand}
            </DataList.Value>
          </DataList.Row>
          <DataList.Row>
            <DataList.Label>ResidualPressure</DataList.Label>
            <DataList.Value>
              {response.features[0].attributes.ResidualPressure}
            </DataList.Value>
          </DataList.Row>
        </DataList>,
      );
    });
    return div;
  };
  const [FireFlowResultsLayer] = useState<FeatureLayer>(
    new FeatureLayer({
      title: "FireFlowResultsLayer",
      source: FireFlowGraphics,
      objectIdField: "ObjectID",
      geometryType: "point",
      spatialReference: { wkid: DefaultSrs },
      fields: FireFlowResultLayerFields,
      popupTemplate: {
        title: "{NodeId}",
        content: PopUpContentFireFlowBatch,
      },
      renderer: FireFlowResultsRenderer,
    }),
  );
  const layerListControl = new LayerList({
    view: viewRef.current!,
    selectionEnabled: true,
    visible: false,
    listItemCreatedFunction: (event) => {
      const item = event.item;
      if (item.layer.type !== "group") {
        item.panel = {
          content: "legend",
          open: true,
        };
      }
    },
  });

  const handleProcessFireFlow = () => {
    console.log("handleProcessFireFlow: at the start");
    setProcessFireFlowInProgress(true);
    try {
      console.log(
        editedPipes.length <= 0 || !sketchGeometry || !featureLayerView,
      );
      if (editedPipes.length <= 0 || !sketchGeometry || !featureLayerView)
        return;
      let query = featureLayerView.createQuery();
      query.geometry = sketchGeometry.extent;
      query.outFields = [LayerConfig.FireFlow.KeyField];
      featureLayerView.queryFeatures(query).then(function (response) {
        let nodeData: string[] = [];
        console.log(response);
        response.features.forEach((element) => {
          nodeData.push(element.attributes[LayerConfig.FireFlow.KeyField]);
        });

        let data = {
          ModelId: modelId,
          Pipes: editedPipes,
          Nodes: nodeData,
        };
        requestFireFlowSimulation(data);
      });
    } catch (ex) {
      console.log(`handleProcessFireFlow: error ${ex}`);
      setProcessFireFlowInProgress(false);
    }
    console.log("handleProcessFireFlow: at the end");
  };

  const handleClearGraphics = () => {
    drawingGraphicsLayer!.removeAll();
    SelectedFeatures.splice(0, SelectedFeatures.length);
    FireFlowGraphics.splice(0, FireFlowGraphics.length);
    removeAllFeaturesFromLayer(FireFlowResultsLayer);
  };

  const createFeatureEffect = (geometry: any) => {
    return new FeatureEffect({
      filter: new FeatureFilter({
        geometry,
        spatialRelationship: "intersects",
        distance: 1,
        units: "meters",
      }),
      excludedEffect: "grayscale(100%) opacity(30%)",
    });
  };

  const updateFilter = (sketchGeometry: any) => {
    console.log("updateFilter: at the start");
    if (!sketchGeometry || !featureLayerView) return;
    const featureEffect = createFeatureEffect(sketchGeometry);

    let layerObjects = [
      { layerView: LayerConfig.Stengeventil.Layer as FeatureLayerView },
      { layerView: LayerConfig.Vannledning.Layer as FeatureLayerView },
    ];

    layerObjects.forEach(({ layerView }) => {
      layerView.featureEffect = featureEffect;
    });

    // if (!tableRef.current) return;

    const { current: view } = viewRef;
    const { layer } = featureLayerView;

    featureTable = new FeatureTable({
      view,
      layer,
      editingEnabled: false,
      //fieldConfigs: fieldConfigs,
      visibleElements: {
        menuItems: {
          clearSelection: true,
          refreshData: true,
          toggleColumns: true,
          selectedRecordsShowAllToggle: true,
          zoomToSelection: true,
        },
      },
      //container: tableRef.current!,
    });

    featureTable.viewModel.filterGeometry = sketchGeometry.extent;
    console.log("updateFilter: at the end");
  };

  interface MapEdits {
    addFeatures?: Graphic[];
    deleteFeatures?: Graphic[];
  }
  const applyEditsToLayer = (layer: FeatureLayer, edits: MapEdits) => {
    layer
      .applyEdits(edits)
      .then((results) => {
        console.log(results);
        FireFlowResultsLayer.queryFeatures().then((results) => {
          console.log("found these features");
          console.log(results);
        });
      })
      .catch((error) => {
        console.error();
      });
  };
  const removeAllFeaturesFromLayer = (layer: FeatureLayer) => {
    layer.queryFeatures().then((results) => {
      const deleteEdits = {
        deleteFeatures: results.features,
      };
      applyEditsToLayer(layer, deleteEdits);
    });
  };

  const processFireFlowResults = (data: FireFlowSimulationData[]) => {
    if (!sketchGeometry || !featureLayerView) return;
    FireFlowGraphics.splice(0, FireFlowGraphics.length);
    //removeAllFeaturesFromLayer(FireFlowResultsLayer);
    setProcessFireFlowInProgress(true);
    let query = featureLayerView.createQuery();
    query.geometry = sketchGeometry.extent;
    query.outFields = [LayerConfig.FireFlow.KeyField];
    let nodeData: Graphic[] = [];
    featureLayerView.queryFeatures(query).then(function (response) {
      let iCounter: number = 1;
      response.features.forEach((element) => {
        let selectedPost = data.find((e) => {
          return e.name === element.attributes[LayerConfig.FireFlow.KeyField];
        });
        if (!selectedPost) {
          setProcessFireFlowInProgress(false);
          return;
        }

        let flowCapacity: string;
        if (selectedPost?.flow > 100) flowCapacity = "4-VeryGoodFlow";
        else if (selectedPost?.flow > 50 && selectedPost?.flow <= 100)
          flowCapacity = "3-GoodFlow";
        else if (selectedPost?.flow > 20 && selectedPost?.flow <= 50)
          flowCapacity = "2-LowToModerateFlow";
        else if (selectedPost?.flow > 0 && selectedPost?.flow <= 20)
          flowCapacity = "1-CriticalLowFlow";
        else flowCapacity = "0-NoFlowAvailable";

        let graphic = {
          geometry: element.geometry,
          attributes: {
            ObjectID: iCounter++,
            NodeId: selectedPost?.name,
            ObjectType: 1,
            FireFlowCapacityClass: flowCapacity,
            FireFlow: selectedPost?.flow,
            StaticPressure: selectedPost?.staticpressure,
            StaticDemand: selectedPost?.staticdemand,
            ResidualPressure: selectedPost?.residualpressure,
          },
        };
        nodeData.push(graphic as Graphic);
      });

      if (nodeData.length > 0)
        applyEditsToLayer(FireFlowResultsLayer, { addFeatures: nodeData });
      setProcessFireFlowInProgress(false);
    });
  };

  const createWebMap = (webMapId: string, portalUrl: string) => {
    return new WebMap({
      portalItem: {
        id: webMapId,
        portal: {
          url: portalUrl,
        },
      },
    });
  };

  const createMapView = (
    mapRef: MutableRefObject<HTMLDivElement | null>,
    webmap: WebMap,
  ) => {
    return new MapView({
      container: mapRef.current!,
      map: webmap,
      popup: {
        defaultPopupTemplateEnabled: false,
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: false,
          breakpoint: false,
        },
      },
    });
  };

  const createSearch = (view: MapView) => {
    return new Search({
      view: view,
      includeDefaultSources: true,
      allPlaceholder: "Search",
      sources: [],
    });
  };

  const createLayerList = (view: MapView) => {
    return new LayerList({
      view: view,
      selectionEnabled: true,
      listItemCreatedFunction: (event) => {
        const item = event.item;
        if (item.layer.type !== "group") {
          item.panel = {
            content: "legend",
            open: false,
          };
        }
      },
    });
  };

  const createSketchViewModel = (
    view: MapView,
    drawingGraphicsLayer: GraphicsLayer,
    PolylineSymbol: SimpleLineSymbol,
    PolygonSymbol: SimpleFillSymbol,
  ) => {
    return new SketchViewModel({
      view: view,
      layer: drawingGraphicsLayer,
      polylineSymbol: PolylineSymbol,
      polygonSymbol: PolygonSymbol,
    });
  };

  const createSketch = (view: MapView, sketchViewModel: SketchViewModel) => {
    return new Sketch({
      view: view,
      creationMode: "single",
      viewModel: sketchViewModel,
      visibleElements: {
        createTools: {
          circle: false,
          point: false,
          polygon: false,
          polyline: false,
        },
        selectionTools: {
          "lasso-selection": false,
          "rectangle-selection": false,
        },
      },
    });
  };

  const createExpand = (
    content: any,
    view: MapView,
    expandIconClass?: string,
    expanded?: boolean,
  ) => {
    return new Expand({
      content: content,
      expandIconClass: expandIconClass,
      expanded: expanded,
      view,
    });
  };

  const addToProcessingAction = {
    title: "Add To Processing",
    id: "add-to-processing",
    className: "esri-icon-edit",
  };

  const addToProcessing = (
    view: MapView,
    selectedFeatures: PipePayLoad[],
    drawingGraphicsLayer: GraphicsLayer,
    selectedSymbol: SimpleLineSymbol,
  ) => {
    console.log("addToProcessing: at the start");

    // Check if node already exists
    const nodeId =
      view.popup.selectedFeature.attributes[LayerConfig.Vannledning.KeyField];
    if (
      selectedFeatures.some((feature) => feature.nodeId === nodeId) ||
      editedPipes.some((pipe) => pipe.nodeId === nodeId)
    ) {
      console.log(`Node with ID ${nodeId} already exists in the list.`);
      return;
    }
    let diameter = pipeDiameter ?? diameterRef.current?.value;
    let pipeStatus = vannledningStatusRef.current?.value;
    const newPipePayload: PipePayLoad = {
      nodeId,
      diameter: Number(diameter ?? 0),
      status: pipeStatus,
      roughness: 0,
    };

    selectedFeatures.push(newPipePayload);
    setEditedPipes((prevEditedPipes) => [...prevEditedPipes, newPipePayload]);

    let graphic = new Graphic({
      geometry: view.popup.selectedFeature.geometry,
      symbol: selectedSymbol,
    });
    drawingGraphicsLayer.add(graphic);

    console.log("addToProcessing: at the end");
  };

  const populatePipeContentForEdit = (graphic: Graphic) => {
    console.log("populatePipeContentForEdit: at the start");
    const fLayer = LayerConfig.Vannledning.Layer as FeatureLayer;
    let query = fLayer.createQuery();
    query.where = `OBJECTID=${graphic.attributes.OBJECTID}`;
    query.outFields = ["*"];
    fLayer.queryFeatures(query).then(function (response) {
      setPipeDiameter(
        response.features[0].attributes[LayerConfig.Vannledning.DiameterField],
      );
    });
    console.log("populatePipeContentForEdit: at the end");
  };

  const AddToSearch = (
    search: Search,
    layer: __esri.Layer,
    searchFields: Array<string>,
    displayField: string,
  ) => {
    let fLayer = layer as FeatureLayer;

    const searchSource: LayerSearchSource = new LayerSearchSource({
      layer: fLayer,
      searchFields: searchFields,
      displayField: displayField,
      exactMatch: false,
      outFields: ["*"],
      name: layer.title,
      placeholder: "example: 45644",
      maxResults: 6,
      maxSuggestions: 6,
      suggestionsEnabled: true,
      minSuggestCharacters: 0,
    });
    search.sources.push(searchSource);
  };

  const onWebMapLoad = (
    webmap: WebMap,
    view: MapView,
    FireFlowResultsLayer: FeatureLayer,
    drawingGraphicsLayer: GraphicsLayer,
    search: Search,
  ) => {
    webmap.load().then(() => {
      FireFlowResultsLayer.spatialReference = view.spatialReference;

      webmap.layers.add(FireFlowResultsLayer);
      webmap.layers.unshift(drawingGraphicsLayer);
      webmap.layers.forEach((layer, index) => {
        view.whenLayerView(layer).then((layerView) => {
          if (layer.type !== "feature") return;
          let fLayer = layer as FeatureLayer;
          if (fLayer.layerId === LayerConfig.FireFlow.LayerId) {
            let fLayerView: FeatureLayerView = layerView as FeatureLayerView;
            LayerConfig.FireFlow.Layer = fLayerView;
            setFeatureLayerView(() => fLayerView);
            if (!LayerConfig.FireFlow.SearchFields) return;
            AddToSearch(
              search,
              layer,
              LayerConfig.FireFlow.SearchFields,
              LayerConfig.FireFlow.DisplayField,
            );
          }

          if (fLayer.layerId === LayerConfig.Stengeventil.LayerId)
            LayerConfig.Stengeventil.Layer = layerView as FeatureLayerView;
          if (fLayer.layerId === LayerConfig.Vannledning.LayerId)
            LayerConfig.Vannledning.Layer = layerView as FeatureLayerView;
        });
      });
    });
  };
  const onWhenMapView = (view: MapView, layerListControl: LayerList) => {
    view.when(async () => {
      view.ui.add(layerListControl, {
        position: "bottom-right",
      });

      view.popup.watch("selectedFeature", (graphic) => {
        if (!graphic) return;
        if (graphic.layer.layerId !== LayerConfig.Vannledning.LayerId) return;
        const graphicTemplate = graphic.getEffectivePopupTemplate();
        console.log(
          `view.popup.watch: before calling populatePipeContentForEdit(graphic)`,
        );
        setShowEditPipePopup(true);
        populatePipeContentForEdit(graphic);
        graphicTemplate.actions = [addToProcessingAction];
        graphicTemplate.content = () => {
          const popupContent = editPipePopup.current!;
          return popupContent;
        };
      });
      view.popup.on("trigger-action", (event) => {
        if (event.action.id === "add-to-processing") {
          addToProcessing(
            view,
            SelectedFeatures,
            drawingGraphicsLayer,
            SelectedSymbol,
          );
        }
      });
    });
  };

  const initializeMapView = useCallback(() => {
    console.log("useCallback: at the start");
    if (!mapRef.current) return;
    const webmap = createWebMap(webMapId, portalUrl);
    const view = createMapView(mapRef, webmap);
    onWhenMapView(view, layerListControl);
    const search = createSearch(view);
    const layerList = createLayerList(view);
    const expandLayerList = new Expand({
      content: layerList,
      expanded: false,
      view,
    });
    const sketchViewModel = createSketchViewModel(
      view,
      drawingGraphicsLayer,
      PolylineSymbol,
      PolygonSymbol,
    );
    const sketch = createSketch(view, sketchViewModel);
    const expandSketch = createExpand(sketch, view, "esri-icon-edit", false);

    expandModifiedFeatures.content = modifiedFeaturesContainer.current!;
    expandModifiedFeatures.view = view;

    runAnalysisPopup.content = runAnalysisPopupContainerRef.current!;
    runAnalysisPopup.view = view;

    expandLayerList.watch("expanded", (expanded) => {
      console.log(`runAnalysisPopup expanded ${expanded}`);
      if (expanded) {
        expandModifiedFeatures.expanded = false;
        expandSketch.expanded = false;
        runAnalysisPopup.expanded = false;
      }
    });

    runAnalysisPopup.watch("expanded", (expanded) => {
      console.log(`runAnalysisPopup expanded ${expanded}`);
      if (expanded) {
        expandModifiedFeatures.expanded = false;
        expandSketch.expanded = false;
        setShowEditPipePopup(false);
        view.popup.visible = false;
        expandLayerList.expanded = false;
      }
    });

    expandModifiedFeatures.watch("expanded", (expanded) => {
      console.log(`expandModifiedFeatures expanded ${expanded}`);
      if (expanded) {
        runAnalysisPopup.expanded = false;
        expandSketch.expanded = false;
        expandLayerList.expanded = false;
      }
    });

    expandSketch.watch("expanded", (expanded) => {
      console.log(`expandSketch expanded ${expanded}`);
      if (expanded) {
        expandModifiedFeatures.expanded = false;
        runAnalysisPopup.expanded = false;
        setShowEditPipePopup(false);
        view.popup.visible = false;
        expandLayerList.expanded = false;
      }
    });

    view.ui.add(search, "top-right");
    view.ui.add(expandSketch, "top-left");
    view.ui.add(expandLayerList, "top-left");
    view.ui.add(runAnalysisPopup, "top-left");
    view.ui.add(expandModifiedFeatures, "top-left");
    viewRef.current = view;
    sketchViewModel.on("create", (event) => {
      if (event.state === "complete") {
        setSketechGeometry(() => event.graphic.geometry);
        updateFilter(event.graphic.geometry);
      }
    });
    sketchViewModel.on("update", (event) => {
      setSketechGeometry(() => event.graphics[0].geometry);
      updateFilter(event.graphics[0].geometry);
    });
    sketchViewModel.on("delete", (event) => {
      handleClearGraphics();
      setEditedPipes([]);
    });

    onWebMapLoad(
      webmap,
      view,
      FireFlowResultsLayer,
      drawingGraphicsLayer,
      search,
    );

    console.log("useCallback: at the end");
  }, [webMapId, portalUrl]);

  useEffect(() => {
    console.log("useEffect: at the start");
    const cleanUp = initializeMapView();
    console.log("useEffect: at the end");
    return cleanUp;
  }, [initializeMapView]);

  const requestFireFlowSimulation = (data: FireFlowSimulationRequest) => {
    console.log("requestFireFlowSimulation: at the start");
    setProcessFireFlowInProgress(true);
    setShowEditPipePopup(false);
    axios
      .post(
        `${process.env.REACT_APP_GWA_API_ENDPOINT}/Simulation/FireFlow`,
        data,
        {
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      )
      .then((response: any) => {
        setProcessFireFlowInProgress(false);
        console.log(
          "requestFireFlowSimulation: Edits saved successfully",
          response,
        );
        processFireFlowResults(response.data.Results);
        expandModifiedFeatures.expanded = false;
        runAnalysisPopup.expanded = false;
        setEditedPipes([]);
      })
      .catch((error: any) => {
        setProcessFireFlowInProgress(false);
        expandModifiedFeatures.expanded = false;
        console.error("Error saving edits", error);
      });
    console.log("requestFireFlowSimulation: at the end");
  };

  return (
    <React.Fragment>
      <Flex className="vh100 w100" flow="column" gap="none">
        <Flex
          className="w100"
          css={{
            backgroundColor: "$colorGreen10",
            height: "100%",
            padding: "$spacingS",
          }}
        >
          <Grid css={{ height: "100%", width: "100%" }} gap={"none"}>
            <GridItem
              className="w100"
              css={{
                width: "100%",
                height: "100%",
              }}
              colSpan={12}
            >
              <div id="viewDiv" ref={mapRef}></div>
            </GridItem>
          </Grid>
        </Flex>
      </Flex>
      {/*run analysis popup*/}
      <div
        className="pAl"
        style={{
          visibility: `${!showRunAnalysisPopup ? "hidden" : "visible"}`,
          display: `${!showRunAnalysisPopup ? "none" : "inline-block"}`,
        }}
      >
        <Flex
          ref={runAnalysisPopupContainerRef}
          className="fill-white pAl"
          flow="column"
          gap="spacingM"
          style={{
            width: `26vw`,
            height: "auto",
            padding: "$spacingM",
          }}
        >
          <Box>
            <Label as="h4" className="pAn">
              Run Analysis Based on Edited Data
            </Label>
          </Box>
          <div className="form-container">
            <Grid
              columns="12"
              gap="none"
              flow="column"
              style={{ width: "100%" }}
              className=" pTm pBm"
            >
              <GridItem colSpan={6}>
                <FormField isDisabled>
                  <FormField.Label>Velg analysetype:</FormField.Label>
                  <Select
                    size={1}
                    value={analysisType}
                    onChange={handleAnalysisTypeChange}
                    options={analysisTypeOptions}
                  ></Select>
                </FormField>
              </GridItem>
              <GridItem colSpan={1}></GridItem>
              <GridItem colSpan={5}>
                <FormField>
                  <FormField.Label>Rest trykk:</FormField.Label>
                  <TextInput
                    size={1}
                    type="number"
                    value={pressure}
                    onChange={handlePressureChange}
                  />
                </FormField>
              </GridItem>
            </Grid>
            <Grid
              columns="12"
              gap="none"
              flow="column"
              style={{ width: "100%" }}
            >
              <GridItem colSpan={6}>
                <FormField>
                  <FormField.Label>Velg ukedag:</FormField.Label>
                  <Select
                    size={1}
                    value={day}
                    onChange={handleDayChange}
                    options={dayOptions}
                  ></Select>
                </FormField>
              </GridItem>
              <GridItem colSpan={1}></GridItem>
              <GridItem colSpan={5}>
                <FormField>
                  <FormField.Label>Velg klokkeslett:</FormField.Label>
                  <TextInput size={1} value={time} />
                </FormField>
              </GridItem>
            </Grid>
            <Grid
              columns="12"
              gap="none"
              flow="column"
              style={{ width: "100%" }}
              className=" pTm pBs"
            >
              <GridItem colSpan={6}>
                <Flex
                  style={{
                    visibility: `${
                      processFireFlowInProgress ? "hidden" : "visible"
                    }`,
                  }}
                >
                  <WaveButton
                    className="btn btn--small"
                    onClick={handleProcessFireFlow}
                  >
                    {"Run Analysis"}
                  </WaveButton>
                </Flex>
                <Flex
                  gap="spacingM"
                  style={{
                    visibility: `${
                      !processFireFlowInProgress ? "hidden" : "visible"
                    }`,
                  }}
                >
                  <Spinner inline size="medium" color="black" />
                </Flex>
              </GridItem>
              <GridItem colSpan={1}></GridItem>
              <GridItem colSpan={5}></GridItem>
            </Grid>
          </div>
        </Flex>
      </div>

      {/*modified pipes popup*/}
      <div
        className="pAl"
        style={{
          visibility: `${!editedPipes.length ? "hidden" : "visible"}`,
          display: `${!editedPipes.length ? "none" : "inline-block"}`,
        }}
      >
        <div
          ref={modifiedFeaturesContainer}
          className="fill-white pAs"
          style={{
            width: `${!editedPipes.length ? 20 : 26}vw`,
            height: "auto",
            padding: "$spacingM",
          }}
        >
          {!editedPipes.length ? (
            <Text as="b" color="colorGray75" className="pAm">
              No contents has been modified yet
            </Text>
          ) : (
            <Flex gap="spacingM" flow="column" className="pAm">
              <Grid columns="12" gap="spacingS" flow="column" className="bdrBm">
                <GridItem colSpan={4}>
                  <Text as="b" color="colorGray75">
                    Pipe Name
                  </Text>
                </GridItem>
                <GridItem colSpan={4}>
                  <Text as="b" color="colorGray75">
                    Diameter
                  </Text>
                </GridItem>
                <GridItem colSpan={4}>
                  <Text as="b" color="colorGray75">
                    Status
                  </Text>
                </GridItem>
              </Grid>
              {editedPipes.map((pipe) => (
                <Grid
                  columns="12"
                  gap="spacingS"
                  flow="column"
                  className="bdrBs"
                >
                  <React.Fragment key={pipe.nodeId}>
                    <GridItem colSpan={4}>
                      <Text className="blue120">{pipe.nodeId}</Text>
                    </GridItem>
                    <GridItem colSpan={4}>
                      <Text className="blue120">{pipe.diameter}</Text>
                    </GridItem>
                    <GridItem colSpan={4}>
                      <Text className="blue120">{pipe.status}</Text>
                    </GridItem>
                  </React.Fragment>
                </Grid>
              ))}
            </Flex>
          )}
        </div>
      </div>

      {/*edit pipe popup*/}
      <div
        style={{
          visibility: `${!showEditPipePopup ? "hidden" : "visible"}`,
          display: `${!showEditPipePopup ? "none" : "inline-block"}`,
        }}
      >
        <div ref={editPipePopup}>
          <ContentBlock max="containerNarrow" gutters="none" center={false}>
            <Flex flow="column" gap="spacingM">
              <AutoGrid min="20ch">
                <FormField as={Flex} flow="column" gap="spacingXs">
                  <FormField.Label>{"Diameter"}</FormField.Label>
                  <TextInput
                    value={pipeDiameter}
                    ref={diameterRef}
                    onChange={(event) => {
                      setPipeDiameter(event.target.value);
                    }}
                  />
                </FormField>
              </AutoGrid>
              <FormField as={Flex} flow="column" gap="spacingXs">
                <FormField.Label>{"Status"}</FormField.Label>
                <Select
                  ref={vannledningStatusRef}
                  value={vannledningStatusValue}
                  onChange={setVannledningStatusValue}
                  options={[
                    { value: "OPEN", label: "Open" },
                    { value: "CLOSED", label: "Closed" },
                  ]}
                />
              </FormField>
            </Flex>
          </ContentBlock>
        </div>
      </div>
    </React.Fragment>
  );
};
export default GisMap;
