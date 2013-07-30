
  $(document).ready(function() {

     dataConfig ={"level":[{"key":"All", "value":0},{"key":"Primary", "value":1},{"key":"Middle", "value":2},{"key":"High", "value":3},{"key":"Other", "value":4}],
                  type:[{key:"All", value:0},{key:"Regular", value:1},{key:"Special", value:2},{key:"Vocational", value:3},{key:"Other", value:4}],
                  locality:[{key:"All", value:0},{key:"City Large", value:11},{key:"City Middle", value:12},{key:"City Small", value:13},
                                                  {key:"Suburb Large", value:21},{key:"Suburb Middle", value:22},{key:"Suburb Small", value:23},
                                                  {key:"Town Fringe", value:31},{key:"Town Distant", value:32},{key:"Town Remote", value:33},
                                                  {key:"Rural Fringe", value:41},{key:"Rural Distant", value:42},{key:"Rural Remote", value:43}],
                  tableFilter:[{key:"Number of Student", value:"member"}, {key:"Free Lunch Percent",value:"frlPct"},{key:"Available Speed",value:"maxdown"}],
                  maxdown:[{key:"N/A",value:0},{key:"N/A",value:1},{key:"N/A",value:2},{key:"768kbps-1.5mbps",value:3},{key:"1.5mbps-3mbps",value:4},{key:"3mbps-6mbps",value:5},
                          {key:"6mbps-10mbps",value:6},{key:"10mbps-25mbps",value:7},{key:"2mbps-50mbps",value:8},{key:"50mbps-100mbps",value:9},{key:"100mbps-1gbps",value:10},{key:">1gbps",value:11}]
                };


     /*d3.select("#type").append("select").on("change", function(e){change();})*/
   d3.select("#type").on("change", function(e){change();})
                      .selectAll("option")
                        .data(dataConfig.type)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.value})
                          .text(function(d){return d.key});

     /*d3.select("#level").append("select").on("change", function(e){change();})*/
   d3.select("#level").on("change", function(e){change();})
                      .selectAll("option")
                        .data(dataConfig.level)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.value})
                          .text(function(d){return d.key});

     /*d3.select("#locality").append("select").on("change", function(e){change();})*/
   d3.select("#locality").on("change", function(e){change();})
                .selectAll("option")
                  .data(dataConfig.locality)
                  .enter()
                  .append("option")
                    .attr("value", function(d){return d.value})
                    .text(function(d){return d.key});
     d3.select("#tableFilter").on("change", function(e){drawTable();})
          .selectAll("option")
            .data(dataConfig.tableFilter)
            .enter()
            .append("option")
              .attr("value", function(d){return d.value})
              .text(function(d){return d.key});

     d3.select("#reset").on("click", function(e){reset("all")});

       $( "#studentSlider" ).slider({
            range: true,
            min: 0,
            max: 6545,
            values: [ 0, 6545 ],
            step: 100,
            slide: function( event, ui ) {
              $( "#numStudents" ).text(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
            },
            stop:function(event,ui){change()}
          });
       $( "#lunchStudentSlider" ).slider({
            range: true,
            min: 0,
            max: 100,
            values: [ 0, 100],
            step: 1,
            slide: function( event, ui ) {
              $( "#lunchStudents" ).text(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
            },
            stop:function(event,ui){change()}
          });
        $( "#maxdownSpeedSlider" ).slider({
            range: true,
            min: 0,
            max: 11,
            values: [ 0, 11],
            step: 1,
            slide: function( event, ui ) {
              $( "#maxdownSpeed" ).text(getMaxdownLabel(ui.values[ 0 ], ui.values[ 1 ]) );
            },
            stop:function(event,ui){change()}
          });
    });

//http://bl.ocks.org/mbostock/5180185
var width = 570,
    height = 350;
var data, schools,centroids,bounds, lbounds;
var stateSelected = false, currentStateFips=null,tableRowSelected=false;
var projection = d3.geo.albersUsa()
    .scale(650)
    .translate([width / 2, height / 2]);
var path = d3.geo.path()
    .projection(projection);
var radius = d3.scale.sqrt()
      .domain([0,1])
      .range([0,30])
var format = d3.format(",");
var filterNumber = 100;
var excludeStates={"59":1, "60":1, "69":1, "66":1, "78":1};
var sql = new cartodb.SQL({ user: 'fcc', format: 'json'});
//leaflet map
// var lmap = new L.Map('detailmap', {
//     center: new L.LatLng(39.5, -98.5),
//     zoom: 4,
//     //layers: new L.TileLayer('http://a.tiles.mapbox.com/v3/herwig.map-onzoztaf/{z}/{x}/{y}.png')
//     // layers: new L.TileLayer('http://' + ["a", "b", "c", "d"][Math.random() * 4 | 0] +'.tiles.mapbox.com/v3/fcc.map-qly54czi/{z}/{x}/{y}.png')
//     layers: new L.TileLayer('http://' + ["a", "b", "c", "d"][Math.random() * 4 | 0] +'.tiles.mapbox.com/v3/fcc.map-toolde8w/{z}/{x}/{y}.png')

// });

//use mapbox.js
  var lmap = L.mapbox.map('detailmap', 'fcc.map-toolde8w')
      .setView([39.5, -98.5], 3);

var svgMap = d3.select(lmap.getPanes().overlayPane).append("svg"),
    gMap = svgMap.append("g").attr("class", "leaflet-zoom-hide");

var canvas = d3.select("#map").insert("canvas")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 1);
var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

var statePaths = svg.append("g")
              .attr("id","statePath"); 
var lakePaths = svg.append("g")
              .attr("id","lakePath"); 
var bubble = svg.append("g")
               .attr("id", "bubbles");

var context = canvas.node().getContext("2d");
context.fillStyle = "#303030";
context.fillRect(0, 0, width, height);



queue()
  .defer(d3.tsv, "data/school_stat.tsv")
  .defer(d3.json, "data/state.topojson")
  .defer(d3.json, "data/state_centroid.geojson")
   .defer(d3.json, "data/greatlakes.geojson")
  .await(ready);
//d3.tsv("data/school_stat.tsv", function(error, school) {
function ready(error, school,state,stateCentroid,greatlakes){
  schools = school.filter(function(d){return d.fips != '59' && d.fips != '60' && d.fips != '69' && d.fips != '66' && d.fips != '78'});
  schools.forEach(function(d) {
    var p = projection([+d.lon, +d.lat]);
    d.x = Math.round(p[0]), d.y = Math.round(p[1]);
    d.fips = +d.fips;
    d.type = +d.type;
    d.ulocal = +d.ulocal;
    d.level = +d.level;
    d.member = +d.member;
    d.frlpct = +d.totfrlPct;
    d.maxdown = +d.maxdown;
    d.id = +d.id;
});
  
  data = crossfilter(schools);
  data.fips = data.dimension(function(d){return d.fips});
  data.groupByFips = data.fips.group();
  data.type = data.dimension(function(d){return d.type});
  data.level = data.dimension(function(d){return d.level});
  data.locality = data.dimension(function(d){return d.ulocal});
  data.frlPct = data.dimension(function(d){return d.frlpct});
  data.member = data.dimension(function(d){return d.member});
  data.maxdown = data.dimension(function(d){return d.maxdown});

var states = topojson.feature(state, state.objects.state).features.filter(function(d){
          return d.id != '60' && d.id != '69' && d.id != '66' && d.id != '78'});
//var stateJson = topojson.feature(state,state.objects.state)
bounds = d3.geo.bounds({type:"FeatureCollection", features:states});
 centroids = stateCentroid.features.filter(function(d){
           return d.properties.fips != '60' && d.properties.fips != '69' && d.properties.fips != '66' && d.properties.fips != '78'});
 centroids.forEach(function(d){d.fips = parseInt(d.properties.fips,10)});

var s = statePaths.selectAll("path")
            .data(states)
              .enter()
              .append("path")
              .attr("d",path)
              .attr("class", "state");
var l = lakePaths.selectAll("path")
            .data(greatlakes.features)
              .enter()
              .append("path")
              .attr("d",path)
              .attr("class", "lakes");        
reset("all");
}

function reset(resetType){
           context.clearRect(0,0,width,height);
          context.globalAlpha = 0.3;
          context.fillStyle = "white";
          schools.forEach(function(d) {
              context.fillRect(d.x, d.y, 1, 1);
          });

        if(resetType == "all"){
            $( "#studentSlider").slider("values", [0,6545]);
            $( "#lunchStudentSlider" ).slider("values", [0,100]);
            $( "#maxdownSpeedSlider" ).slider("values", [0,11]);
            $("#type").val(0);
            $("#level").val(0);
            $("#locality").val(0);
        }

         d3.selectAll('.circle').remove();
          d3.selectAll('.lcircle').remove();
       // d3.selectAll('.circleKey').remove();
        d3.selectAll(".pulse_circle").remove();
        d3.select("#contents").html("");
        d3.select("#recordSection").style("display","none");
		d3.select("#tble-filter").style("display","none");
        /*d3.select("#resetSection").style("display","none");*/
        d3.select("#txtSelection").text("0 schools selected out of " + data.size()); 
        lmap.setView([39.5, -98.5], 3);
}

function drawBubbles(){
//   radius.domain([0,data.groupByFips.top(1)[0].value]);
//    var valueObj = d3.nest().key(function(d){return d.key}).map(data.groupByFips.top(Infinity));
//    var bubbleData = centroids.filter(function(d){return valueObj[d.fips] != "undefined"}); 

//   var bubbles = bubble.selectAll(".circle")
//                       .data(bubbleData, function(d){return d.fips});

//   //enter
//   bubbles.enter().append("circle").attr("class","circle")
//            .attr("transform", function(d){
//                             var c = projection(d.geometry.coordinates);
//                             var x = c[0], y = c[1];
//                             return "translate(" + x + "," + y + ")";
//                           })
//             .attr("r", function(d){return radius(valueObj[d.fips][0].value)})
//             .on("click", function(d){showState(d,this)});

// //update
//   bubbles.attr("class","circle")
//         .transition()
//           .duration(750)
//            .attr("r", function(d){return radius(valueObj[d.fips][0].value)});

//   //exit
//   bubbles.exit().attr("class","circle")
//           .transition()
//           .duration(750)
//           .style("fill-opacity",1e-6)
//           .remove();

//   drawCircleKey();
  drawTable();

}
function drawTable(){
  d3.select("#contents").html("");

  var currentTableFilter = $("#tableFilter").val();
  var content = "", d=null, ids=[];
  content += "<table id='tbl-recordDetails' class='table table-hover tablesorter'><thead><tr><th><div class='sort-wrapper'>Name &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Student Number &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Free Lunch Pct &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Type &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Level &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Available Speed &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>State &nbsp;<span class='sort'></span></div></th><th>Locality</th></tr></thead>";
  if (!stateSelected){
    d = data[currentTableFilter].top(filterNumber);
    d3.select("#tableFilterTxt").html("First " + filterNumber + " of " + data.member.top("Infinity").length + " schools."); 
  } else{
    d = data[currentTableFilter].top(Infinity).filter(function(d){return d.fips==currentStateFips}).filter(function(d,i){return i<filterNumber})
    d3.select("#tableFilterTxt").html("Top " + filterNumber + " of selected schools in " + getStateName(currentStateFips).name + " filtered by "); 
  }

  d.forEach(function(e){ids.push(e.id)});

  sql.execute("SELECT id, schnam FROM school_stat where id in(" + ids.join(",") + ")").done(function(data){
            // var subjects = [];
            // for (var i = 0; i < data.rows.length; i++){
            //     subjects.push(data.rows[i].name)
            // };
            // $('#filter').typeahead({source: subjects}) 
   var resultsObj = d3.nest()
              .key(function(d){return d.id})
                .map(data.rows);
    d.forEach(function(e){return e.schoolname = resultsObj[e.id][0].schnam});

    content += "<tbody>";
    for (var i = 0, length = d.length; i<length; i++) {
    //console.log(d[i].fips + " " + getStateName(d[i].fips).abbrName)
              content += "<tr data-lat=" + d[i].lat + " data-lon=" + d[i].lon + "><td>" + d[i].schoolname + "</td>";
              content += "<td>" + format(d[i].member) + "</td>";
              content += "<td>" + d[i].frlpct + "</td>";
              content += "<td>" + getVariableName('type', +d[i].type) + "</td>";
              content += "<td>" + getVariableName('level', +d[i].level) + "</td>";
              content += "<td>" + getVariableName('maxdown', +d[i].maxdown) + "</td>";
              content += "<td>" + getStateName(d[i].fips).abbrName + "</td>";
              content += "<td>" + getVariableName('locality', +d[i].ulocal) + "</td></tr>";
        } 
    content +="</tbody></table>";

    $("#contents").html(content);
    initTblSort();

    d3.selectAll("#tbl-recordDetails tbody tr").on("click", function(){
            tableRowSelected = false;
            if (d3.select(this).classed('tablerowselected')){
              tableRowSelected = true;
            }
             d3.selectAll("#tbl-recordDetails tbody tr").classed('tablerowselected',false);
            highlight(d3.select(this));
          });
    drawLMap(d);

  })

 
}

function drawLMap(pts){
  var coords = [];
  var latlon=[];
  pts.forEach(function(d){
    var a = [+d.lon, +d.lat];
    coords.push(a);
    var b = new L.LatLng(+d.lat,+d.lon);
    latlon.push(b);
  })

 lbounds= new L.LatLngBounds(latlon);
  //console.log(bounds);
  lmap.fitBounds(lbounds);

  bubblesL = gMap.selectAll(".lcircle")
                      .data(coords, function(d){return d});

  //enter
  bubblesL.enter().append("circle").attr("class","lcircle")
           .attr("transform", function(d){
                            var c = project(d);
                            var x = c[0], y = c[1];
                            return "translate(" + x + "," + y + ")";
                          })
            .attr("r", 2)
            //.on("click", function(d){showState(d,this)});

//update
  bubblesL.attr("class","lcircle")
        .transition()
          .duration(750)
          .attr("transform", function(d){
                var c = project(d);
                var x = c[0], y = c[1];
                return "translate(" + x + "," + y + ")";
              })
          .attr("r", 2)

  //exit
  bubblesL.exit().attr("class","lcircle")
          .transition()
          .duration(750)
          .style("fill-opacity",1e-6)
          .remove();

  lmap.on("viewreset", resetMap);
  resetMap();
}

function resetMap(){
   // var bottomLeft = project([bounds.getSouthWest().lng, bounds.getSouthWest().lat]),
   //      topRight = project([bounds.getNorthEast().lng, bounds.getNorthEast().lat]);
   var bottomLeft = project(bounds[0]),
        topRight = project(bounds[1]);

    svgMap .attr("width", topRight[0] - bottomLeft[0])
        .attr("height", bottomLeft[1] - topRight[1])
        .style("margin-left", bottomLeft[0] + "px")
        .style("margin-top", topRight[1] + "px");

    gMap.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
    d3.transition(bubblesL)
                    .attr("class", "lcircle")
                    .attr("transform", function(d) {
                          var c = project(d)
                          x = c[0];
                          y = c[1];
                          return "translate(" + x + "," + y + ")";
                    })
   
    gMap.selectAll(".pulse_circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = project(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
}

function initTblSort() {
  if ($('#tbl-recordDetails') && $('#tbl-recordDetails tbody tr').length > 1) {
    $('#tbl-recordDetails').dataTable({
      "aoColumns": [null, null, null, null,null,null,null,null],
	  "aoColumnDefs": [
	          { 'bSortable': false, 'aTargets': [ 7 ] }
	       ],
      "aaSorting": [
       // [1, "desc"]
      ],
      "bDestroy": true,
      "bFilter": false,
      "bInfo": false,
      "bPaginate": false,
      "bLengthChange": false,
    "bScrollCollapse": true,
    "sScrollY": 400/*,
    "sScrollX": "100%",
      "sScrollXInner": "110%"*/
    });
  }
}

function showState(d, element){
  var ee = d3.select(element);
  if (currentStateFips == +d.fips){
      ee.classed("selected", false);
      stateSelected = false;
      currentStateFips = null;
  }else{
    d3.selectAll(".circle").classed("selected", false);
    currentStateFips = +d.fips;
    stateSelected = true;
    ee.classed("selected", true);
  }
  
  drawTable();
}

function getStateName(fips){
  var stateName = {};
  var s = centroids.filter(function(d){return d.fips == parseInt(fips,10)});
  stateName.abbrName = s[0].properties.abbrname;
  stateName.name = s[0].properties.name;
  return stateName;
}

function getVariableName(type, value){
  return dataConfig[type].filter(function(d){return +d.value==value})[0].key;
}

function getMaxdownLabel(val1,val2){
  var a ="";
  if (val1<3 || val1==11){
    a+=dataConfig["maxdown"].filter(function(d){return +d.value==val1})[0].key
  }else if (val1>=3){
    a+=dataConfig["maxdown"].filter(function(d){return +d.value==val1})[0].key.split("-")[0];
  }
  a+=" - ";
  if (val2<3 || val2 == 11){
    a+=dataConfig["maxdown"].filter(function(d){return +d.value==val2})[0].key
  }else{
    a+=dataConfig["maxdown"].filter(function(d){return +d.value==val2})[0].key.split("-")[1];
  }
  return a;
}

function drawCircleKey(){
  var finalBreaks=[];
  d3.selectAll(".key").remove();
  var circleKey = svg.append("g")
    .attr("class", "key")
    .attr("transform", "translate(500,280)");
  var breaks = ss.jenks(data.groupByFips.top(Infinity).map(function(d){return d.value}),3);
  breaks.forEach(function(d){
    d != null? finalBreaks.push(d):null;
  })
  
 var keyLegend = scaleKeyCircle()
        .scale(radius)
        .tickValues(finalBreaks)
        //.tickExtend(15)
        .orient("right");
  keyLegend(circleKey);

}

  function change() {
     var filterType = +$("#type").val();
     var filterLevel = +$("#level").val();
     var filterLocality = +$("#locality").val();
     var filterNumStudent = $( "#studentSlider" ).slider('values');
     var filterFrlPct = $( "#lunchStudentSlider" ).slider('values');
     var filterMaxdownSpeed = $( "#maxdownSpeedSlider" ).slider('values');;


      data.type.filterAll();
      data.level.filterAll();
      data.locality.filterAll();
      data.member.filterAll();
      data.frlPct.filterAll();
      data.fips.filterAll();
      data.maxdown.filterAll();

    filterType==0 ? data.type.filterAll() : data.type.filterExact(filterType);
    filterLevel==0 ? data.level.filterAll() : data.level.filterExact(filterLevel);
    filterLocality==0 ? data.locality.filterAll() : data.locality.filterExact(filterLocality);
    data.maxdown.filterRange([filterMaxdownSpeed[0],filterMaxdownSpeed[1]+1]);
    data.member.filterRange([filterNumStudent[0],filterNumStudent[1]+1]);
    data.frlPct.filterRange([filterFrlPct[0],filterFrlPct[1]+1]);

    context.clearRect(0,0,width,height);

    if (data.member.top(Infinity).length == 0){
        reset("map");
    }
    else{
       // Render the inactive schools.
        context.globalAlpha = 0.3;
        var fillColor;
        context.fillStyle = "white";
        schools.forEach(function(d) {
              context.fillRect(d.x, d.y, 1, 1);
          });

        // Render the active schools.
        context.globalAlpha = 1;
        context.fillStyle = "yellow";
        var renderSize =1;
        data.member.top(Infinity).length <1000? renderSize=2:renderSize=1;
        data.member.top(Infinity).forEach(function(d) {
              context.fillRect(d.x, d.y, renderSize, renderSize);
        })
        d3.select("#txtSelection").text(format(data.member.top("Infinity").length) + " schools found out of " + data.size());
        drawBubbles();
        d3.select("#recordSection").style("display", "block");
		d3.select("#tble-filter").style("display", data.member.top("Infinity").length>filterNumber?"block":"none");
        d3.selectAll(".pulse_circle").remove();
    }
  }

// Use Leaflet to implement a D3 geographic projection.
function project(x) {
    var point = lmap.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
    return [point.x, point.y];
  }

function highlight(selectedRow){
  var lat = +selectedRow.attr("data-lat"), lon = +selectedRow.attr("data-lon");
  var coord=[lon,lat];

  d3.selectAll(".pulse_circle").remove();

  if (tableRowSelected){
    lmap.fitBounds(lbounds);
  }
  else{
      selectedRow.classed('tablerowselected', true);

     bubble.selectAll(".pulse_circle").data([coord])
                .enter().append("circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = projection(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
                    .each(pulse());
      gMap.selectAll(".pulse_circle").data([coord])
                .enter().append("circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = project(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
                    .each(pulse()); 
      lmap.setView([lat, lon], 17);
  }
}

// function removeHighlight(){
//   d3.selectAll(".pulse_circle").remove();
//   //lmap.setView(new L.LatLng(38.9, -77.01),12);
//   //reset();

// }

function pulse() {
              return function(d, i, j) {
                  //the stuff before transition() resets the
                  //attributes of the pulser when this function is
                  //called again
                  d3.select(this).attr("r", 5).style("stroke-opacity", 1.0)
                  .transition()
                  .ease("linear") //appears a lot more smoother
                  .duration(1000)
                  .attr("r",25)
                  .style("stroke-opacity", 0.0)
                  .each("end", pulse()); //lather rinse repeat
              };
          }

function scaleKeyCircle() {
  var scale,
      orient = "left",
      tickPadding = 3,
      tickExtend = 5,
      tickArguments_ = [5],
      tickValues = null,
      tickFormat_
 
 
function key(g) {
    g.each(function() {
      var g = d3.select(this);
 
      // Ticks, or domain values for ordinal scales.
      var ticks = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments_) : scale.domain()) : tickValues,
          tickFormat = tickFormat_ == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments_) : String) : tickFormat_;
 
      ticks = ticks.slice().reverse()
 
      ticks.forEach(function(tick) {
        var gg = g.append('g')
          .attr('class', 'circleKey')
          .attr('transform', 'translate(0,' + - scale(tick) + ')' )
 
        gg.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', scale(tick))
 
        var x1 = scale(tick),
            x2 = tickExtend + scale(ticks[0]),
            tx = x2 + tickPadding,
            textAnchor = "start"
 
        if ("left" == orient) {
          x1 = -x1
          x2 = -x2
          tx = -tx
          textAnchor = "end"
        }
 
        gg.append('line')
          .attr('x1', x1)
          .attr('x2', x2)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', '#000')
          .text(tick)
 
        gg.append('text')
          .attr('transform', 'translate('+ tx +', 0)' )
          .attr('dy', '.35em')
          .style('text-anchor', textAnchor)
          .text(tickFormat(tick))
      })
 
    })
  }
 
  key.scale = function(value) {
    if (!arguments.length) return scale;
    scale = value;
    return key;
  };
 
  key.orient = function(value) {
    if (!arguments.length) return orient;
    orient = value;
    return key;
  };
 
  key.ticks = function() {
    if (!arguments.length) return tickArguments_;
    tickArguments_ = arguments;
    return key;
  };
 
  key.tickFormat = function(x) {
    if (!arguments.length) return tickFormat_;
    tickFormat_ = x;
    return key;
  };
 
  key.tickValues = function(x) {
    if (!arguments.length) return tickValues;
    tickValues = x;
    return key;
  };
 
  key.tickPadding = function(x) {
    if (!arguments.length) return tickPadding;
    tickPadding = +x;
    return key;
  };
 
  key.tickExtend = function(x) {
    if (!arguments.length) return tickExtend;
    tickExtend = +x;
    return key;
  };
 
  key.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return key;
  };
 
  key.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    return key;
  };
 
  return key;
}
