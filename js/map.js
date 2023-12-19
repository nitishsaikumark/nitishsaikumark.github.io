/** Class representing the map view. */
class MapVis {
  /**
   * Creates a Map Visuzation
   * @param globalApplicationState The shared global application state (has the data and the line chart instance in it)
   */
  constructor(globalApplicationState) {
    this.globalApplicationState = globalApplicationState;
    d3.select("#clear-button").on("click", ()=>{
      this.globalApplicationState.selectedLocations = [];
      this.globalApplicationState.worldMap.updateSelectedCountries();
      this.globalApplicationState.lineChart.updateSelectedCountries();
    });
    // Set up the map projection
    const projection = d3.geoWinkel3()
      .scale(150) // This set the size of the map
      .translate([400, 250]); // This moves the map to the center of the SVG
      this.renderMap(this.globalApplicationState,this.globalApplicationState.mapData, projection);
  }

  updateSelectedCountries() {
    const selectedLocations = globalApplicationState.selectedLocations;
    
    // add "selected" class for selected countries
    d3.selectAll('.country')
      .classed('selected', entry => selectedLocations.includes(entry.id));
  }

  RegionSelected() {
    const Id = d3.select(this).attr("id");
    const selectedLocations = globalApplicationState.selectedLocations;
    const result = selectedLocations.indexOf(Id);
    if (result !== -1) {
      selectedLocations.splice(result, 1);
    } else {
      selectedLocations.push(Id);
    }
    globalApplicationState.worldMap.updateSelectedCountries();
    globalApplicationState.lineChart.updateSelectedCountries();
  }
  
  
  findMaxTotalCasesByCountry(data) {
    const Max_cases = {};
    const filtered_data = d3.group(data, (entry) => entry.iso_code);
  
    filtered_data.forEach((values, key) => {
      Max_cases[key] = d3.max(values, (entry) => parseFloat(entry.total_cases_per_million));
    });
  
    return Max_cases;
  }
  
  renderGraticules(path) {
    const graticule = d3.geoGraticule();
    const graticules = d3.select("#graticules");

    // Draw graticule lines
    graticules.append("path")
        .attr("d", path(graticule()))
        .attr("fill", "none")
        .attr("stroke", "black")
        .style("opacity", 0.3);

    // Graticule outline
    graticules.append("path")
        .attr("d", path(graticule.outline()))
        .attr("fill", "none")
        .attr("stroke", "black");
}


  // Contruct the dom
  renderMap(globalState, inputMapData, projection) {
    const mapData = inputMapData;
    const Json_data = topojson.feature(mapData, mapData.objects.countries);
    const path = d3.geoPath().projection(projection);
    let Max_cases = this.findMaxTotalCasesByCountry(globalState.covidData);
  
      const colorMap = d3.scaleSequential(d3.interpolateReds) // Use interpolateReds for the color scale
    .domain([
      0,
      d3.max(globalState.covidData, (entry) => parseFloat(entry.total_cases_per_million)),
    ]);

    const countries = d3.select("#countries")
                      .selectAll("path")
                      .data(Json_data.features);

      countries.enter()
                .append("path")
                .merge(countries)
                .attr("d", path)
                .attr("id", (entry) => entry.id)
                .style("fill", (entry) => {
                  const maxCases = Max_cases[entry.id] || 0;
                  return colorMap(maxCases);
                })
                .classed("country", true)
                    .on("click", this.RegionSelected);

      this.renderGraticules(path);

      // legend
      const legendMap = d3
        .select("#map")
        .append("g")
        .attr("id", "legend")
        .attr("transform", "translate(0, 475)");

      // Define the color scale with red color
      const colorScale = d3.scaleSequential(d3.interpolateReds) // Use the Reds color scale
        .domain([0, 660]); // Change the domain to 0-660

      // Create a gradient for the legend
      legendMap.append("defs")
        .append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .selectAll("stop")
        .data(d3.ticks(0, 660, 11)) 
        .enter()
        .append("stop")
        .attr("offset", d => `${((d / 660) * 100)}%`) // Adjust the percentage
        .attr("stop-color", d => colorScale(d));

      // Create the gradient rectangle
      legendMap.append("rect")
        .attr("width", 150) 
        .attr("height", 20)  
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "url(#legendGradient");

      // Add text labels for the legend
      legendMap.append("text")
        .text("0")
        .attr("x", 0)
        .attr("y", -5); 

        legendMap.append("text")
        .text("660k")
        .attr("x", 120) 
        .attr("y", -5); 

  }
}
