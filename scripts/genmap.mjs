import fs from 'fs';
import {feature,mesh} from 'topojson-client';
import {geoConicConformal,geoPath} from 'd3-geo';
import {presimplify,simplify,quantile} from 'topojson-simplify';
let t=JSON.parse(fs.readFileSync('/tmp/node_modules/sane-topojson/dist/north-america_50m.json'));t=presimplify(t);t=simplify(t,quantile(t,+process.argv[2]));
const W=700,H=400;
const pts=[[-141,60],[-139,69.6],[-124,48.2],[-95,48.8],[-83,41.8],[-64,43.3],[-52.6,47.4],[-55.5,52],[-64,60.3],[-68.5,64.8],[-95,70]];
// Update 25 (from the zip): run "node scripts/genmap.mjs 0.1" after "npm i sane-topojson topojson-client topojson-simplify d3-geo" in /tmp,
// then add the extra cities and province middles (see lib/zip/mapdata.json: cities, provc).
const proj=geoConicConformal().parallels([49,77]).rotate([96,0]).fitExtent([[8,8],[W-8,H-24]],{type:'MultiPoint',coordinates:pts}).clipExtent([[-5,-5],[W+5,H+5]]);
const path=geoPath(proj).digits(1);
const subs=feature(t,t.objects.subunits).features;
const can={};subs.filter(f=>f.properties.gu==='CAN').forEach(f=>{can[f.id]=path(f);});
const usa=path({type:'FeatureCollection',features:feature(t,t.objects.countries).features.filter(f=>f.id==='USA'||f.id==='GRL')})||'';
const countries=feature(t,t.objects.countries).features.map(f=>f.id);
const lakes=feature(t,t.objects.lakes);const lk=path(lakes);
const lab={};subs.filter(f=>f.properties.gu==='CAN').forEach(f=>{lab[f.id]=proj(f.properties.ct).map(v=>Math.round(v));});
const geo={'Toronto':[-79.38,43.65],'Mississauga':[-79.64,43.59],'Kitchener':[-80.49,43.45],'Ottawa':[-75.7,45.42],'Montréal':[-73.57,45.5],'Québec City':[-71.21,46.81],'Halifax':[-63.58,44.65],'Moncton':[-64.78,46.09],'St. John’s':[-52.71,47.56],'Winnipeg':[-97.14,49.9],'Saskatoon':[-106.67,52.13],'Calgary':[-114.07,51.05],'Edmonton':[-113.49,53.55],'Vancouver':[-123.12,49.28],'Victoria':[-123.37,48.43],'Whitehorse':[-135.06,60.72],'Yellowknife':[-114.37,62.45],'Iqaluit':[-68.52,63.75],'Charlottetown':[-63.13,46.24],'Regina':[-104.62,50.45],'Fredericton':[-66.64,45.96],'Hamilton':[-79.87,43.26],'London':[-81.25,42.98],'Kelowna':[-119.5,49.89],'Surrey':[-122.85,49.19],'Brampton':[-79.76,43.73],'Gatineau':[-75.7,45.48],'Laval':[-73.71,45.61],'Saint John':[-66.06,45.27],'Sudbury':[-80.99,46.49],'Thunder Bay':[-89.25,48.38],'Windsor':[-83.03,42.31]};
const cities={};for(const k in geo)cities[k]=proj(geo[k]).map(v=>Math.round(v*10)/10);
const out={W,H,can,usa,lakes:lk,lab,cities};
fs.writeFileSync('/tmp/v2/mapdata.json',JSON.stringify(out));
console.log(countries.join(','),JSON.stringify(out).length, Object.keys(can).length, usa.length, lk.length);
