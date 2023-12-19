/** Class representing the line chart view. */
class LineChart {
  /**
   * Creates a LineChart
   * @param globalApplicationState The shared global application state (has the data and map instance in it)
   */
  constructor(globalApplicationState) {
    // Set some class level variables
    this.globalApplicationState = globalApplicationState;
    this.width = 650;
    this.height = 490;
    const covid_Data = this.globalApplicationState.covidData;

    for (let i = 0; i < covid_Data.length; i++) {
      const entry = covid_Data[i];
      entry.date = d3.timeParse("%Y-%m-%d")(entry.date);
      entry.total_cases_per_million = entry.total_cases_per_million === "" ? 0 : parseFloat(entry.total_cases_per_million);
    }
    const padding = { top: 15, bottom: 64, left: 90, right: 50 };
    const dateExtent = d3.extent(covid_Data, (entry) => entry.date);
    this.xScale = d3
      .scaleTime()
      .domain(dateExtent)
      .range([padding.left, this.width - padding.right]);

    const xAxis = d3.axisBottom(this.xScale)
                  .tickFormat(d3.timeFormat("%b %y"));

    const xAxisGroup = d3.select("#x-axis")
    .attr("transform", `translate(0, ${this.height - padding.bottom})`);
    xAxisGroup.call(xAxis);
    this.renderContinent();
    let svg = d3.select('#line-chart');

    const ylabelGroup = svg.append("g");

    const ylabelText = ylabelGroup.append("text")
      .attr("text-anchor", "end")
      .attr("y", 7)
      .attr("dy", ".80em")
      .attr("transform", "rotate(-90)")
      .text("Cases Per Million");

    const xlabelGroup = svg.append("g");
    const xlabelText = xlabelGroup.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .text("Date");

    const horizontalTranslation = this.width / 2 + padding.right;
    const heightOffsetXLabel = this.height - (padding.bottom / 3);
    const xlabelTransform = `translate(${horizontalTranslation}, ${heightOffsetXLabel})`;
    xlabelGroup.attr("transform", xlabelTransform);
    const verticalTranslation = 6;
    const heightOffset = (this.height - padding.bottom) / 2 - 50;
    const ylabelTransform = `translate(${verticalTranslation}, ${heightOffset})`;
    ylabelGroup.attr("transform", ylabelTransform);

  }

  updateSelectedCountries() {
    const selectedLocations = globalApplicationState.selectedLocations;
    const hasSelectedLocations = selectedLocations.length > 0;
  
    if (hasSelectedLocations) {
      this.showSelectedLocations();
    } else {
      this.renderContinent();
    }
  }
  

  renderContinent() {
    const padding = { top: 15, bottom: 64, left: 90, right: 50 };
    const pathLineGenerator = d3.line()
    .x((entry) => this.xScale(entry.date))
    .y((entry) => yValueRange(entry.total_cases_per_million));
    const pathlinesSelected = d3.select("#lines");
    // yscale for max range
    const yValueRange = d3.scaleLinear();
    yValueRange.domain([0, 350000]);
    yValueRange.range([this.height - padding.bottom, 10]);
    // y-axis
    const yAxisCont = d3.select("#y-axis")
    .attr("transform", `translate(${padding.left}, 0)`);
    yAxisCont.call(d3.axisLeft(yValueRange));
    // filter continent data
    const globalState = this.globalApplicationState;
    const covid_data = globalState.covidData;
    const filter_Data = covid_data.filter(function (entry) {
      return entry.iso_code.startsWith("OWID");
    });

    const continent_data = d3.group(filter_Data, (entry) => entry.iso_code);
    const contColorScheme = d3.scaleOrdinal();
    contColorScheme.domain(continent_data.keys());
    contColorScheme.range(d3.schemeTableau10);
    this.color = contColorScheme;

    const Selectedlines = pathlinesSelected.selectAll('path')
      .data(continent_data);
    const displaylines = Selectedlines.enter().append("path");
    displaylines.classed("line", true);

    displaylines
      .attr("fill", "none")
      .attr("stroke", ([group, values]) => this.color(group))
      .attr("d", ([group, values]) => pathLineGenerator(values));

    this.render_Overlay(filter_Data);
  }




  render_Overlay(data) {
    const height = this.height;
    const width = this.width;
    const dateFormat = d3.timeFormat("%Y-%m-%d");
    const padding = { top: 15, bottom: 64, left: 90, right: 50 };
    const Size_x = 805;
    const x_left = Size_x + padding.left;
    const x_right = Size_x + width - padding.right;
    const handleMouseMove = (event) => {
        if (event.clientX > x_left)
        { 
          if(event.clientX < x_right) 
          {
            const xPosition = event.clientX - Size_x;
            const invertedDate = this.xScale.invert(xPosition);
            const year = dateFormat(invertedDate);

            const newData = this.filterDataByYear(data,year);
            const sortedData = this.sortDataByCases(newData);
            const interruptionPointX = this.xScale(d3.timeParse("%Y-%m-%d")("2021-01-01"));
            const groupedData = d3.group(sortedData, (entry) => entry.iso_code);
            const verticalAdjustment = 20 * groupedData.size;
            const adjustLineHeight = (event.clientX - Size_x) < interruptionPointX;

            this.updateOverlayLine(event, adjustLineHeight, verticalAdjustment);
            this.updateOverlayText(sortedData, padding);

        }
      }
    };
    d3.select("#line-chart").on('mousemove', handleMouseMove);
}

updateOverlayLine(event, adjustLineHeight, verticalAdjustment) {
    const Size_x = 805;
    const padding = { top: 15, bottom: 64, left: 90, right: 50 };
    // Select the overlay element and the line element within it
    const overlay = d3.select('#overlay');
    const line = overlay.select('line');
    const height = this.height;
    const x = event.clientX - Size_x;
    const y1 = height - padding.bottom;
    let y2;

    if (adjustLineHeight) {
      y2 = padding.top + verticalAdjustment;
    } else {
      y2 = padding.top;
    }
    line.attr('stroke', 'black')
        .attr("stroke-width", 1)
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y1)
        .attr('y2', y2);
}

 updateOverlayText(sortedData, padding) {
    const overlay = d3.select('#overlay');
    const textElements = overlay.selectAll('text');
    const formatNumber = d3.format('.3s');
    const boundData = textElements.data(sortedData).join('text');
    // Set text content
    boundData.text((entry) => `${entry.location}: ${formatNumber(entry.total_cases_per_million)}`);
    boundData.attr('x', padding.left + 2)
        .attr('y', (entry, i) => 20 * i + padding.top)
        .attr('alignment-baseline', 'hanging');
    boundData.attr('fill', (entry) => this.color(entry.iso_code));
}

filterDataByYear(data, year) {
  return data.filter((row) => d3.timeFormat("%Y-%m-%d")(row.date) === year);
}

filterDataBySelectedLocations(selectedLocations, covidData) {
  return covidData.filter(entry => selectedLocations.includes(entry.iso_code));
}

updateLinePaths(groupedData, lineGenerator) {
  const lineContainer = d3.select("#lines");
  const pathSelection = lineContainer.selectAll('.line').data(groupedData);

  pathSelection
      .join('path')
      .classed('line', true)
      .attr('fill', 'none')
      .attr('stroke', ([group]) => this.color(group))
      .attr('d', ([, values]) => lineGenerator(values));
}

  showSelectedLocations() {
    const selectedLocations = this.globalApplicationState.selectedLocations;
    const padding = { top: 15, bottom: 64, left: 90, right: 50 };
    const covid_data = this.globalApplicationState.covidData;
    const filtered_data = this.filterDataBySelectedLocations(selectedLocations,covid_data);
    const filtered_cont = d3.group(filtered_data, (entry) => entry.iso_code);
    const contColorScheme = d3.scaleOrdinal()
      .domain(filtered_cont.keys())
      .range(d3.schemeTableau10);
    this.color = contColorScheme;


    const yValueRange = d3.scaleLinear();
    const maxTotalCases = d3.max(filtered_data, (d) => d.total_cases_per_million);
    yValueRange.domain([0, maxTotalCases]);
    // Define the range for the yValueRange
    yValueRange.range([this.height - padding.bottom, 10]);
    yValueRange.nice();
    const yAxis = d3.select("#y-axis")
    .attr("transform", `translate(${padding.left}, 0)`);
    yAxis.call(d3.axisLeft(yValueRange));

    // Create a line generator for the line chart
    const pathLineGenerator = d3.line()
    .x((entry) => this.xScale(entry.date))
    .y((entry) => yValueRange(entry.total_cases_per_million));

    this.updateLinePaths(filtered_cont,pathLineGenerator);
    this.render_Overlay(filtered_data);
  }

 sortDataByCases(data) {
    return data.sort((rowA, rowB) => rowB.total_cases_per_million - rowA.total_cases_per_million);
}

 groupDataByIsoCode(data) {
    return d3.group(data, (entry) => entry.iso_code);
}

  
}