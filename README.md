# cbers-tiler

### Description

Create a highly customizable `serverless` tile server for CBERS-4 AWS Public Public Dataset.
This project is based on [rio-tiler](https://github.com/mapbox/rio-tiler) python library.


#### CBERS-4 data on AWS

Hosted since late 2017 on AWS, CBERS-4 data offers an alternative to cbers and Sentinel data (https://aws.amazon.com/fr/blogs/publicsector/the-china-brazil-earth-resources-satellite-mission/).

> China–Brazil Earth Resources Satellite 4 (CBERS-4), also known as Ziyuan I-04 or Ziyuan 1E, is a remote sensing satellite intended for operation as part of the China–Brazil Earth Resources Satellite programme between the China Centre for Resources Satellite Data and Application and Brazil's National Institute for Space Research. The fifth CBERS satellite to fly, it was successfully launched on 7 December 2014. It replaces CBERS-3 which was lost in a launch failure in December 2013.

source: https://en.wikipedia.org/wiki/CBERS-4

---

# Installation

##### Requirement
  - AWS Account
  - Docker
  - node + npm


#### Create the package

```bash
# Build Amazon linux AMI docker container + Install Python modules + create package
git clone https://github.com/mapbox/cbers-tiler.git
cd cbers-tiler/
make all
```

#### Deploy to AWS
One of the easiest way to **Build** and **Deploy** a Lambda function is to use [Serverless](https://serverless.com) toolkit. We took care of the `building` part with docker so we will just ask **Serverless** to *only* upload our package file to AWS S3, to setup AWS Lambda and AWS API Gateway.

```bash
#configure serverless (https://serverless.com/framework/docs/providers/aws/guide/credentials/)
npm install
sls deploy
```

<img width="500" alt="sls deploy" src="https://cloud.githubusercontent.com/assets/10407788/22188728/d9ffec44-e0e5-11e6-9a77-569a791ccaf2.png">

:tada: You should be all set there.

---
# Use it: cbers-viewer

#### cbers-tiler + Mapbox GL + Satellite API

The `viewer/` directory contains a UI example to use with your new Lambda cbers tiler endpoint. It combine the power of mapbox-gl and the nice developmentseed [sat-api](https://github.com/sat-utils/sat-api) to create a simple and fast **cbers-viewer**.

To be able to run it, edit those [two lines](https://github.com/mapbox/cbers-tiler/blob/master/viewer/js/app.js#L3-L4) in `viewer/js/app.js`
```js
// viewer/js/app.js
3  mapboxgl.accessToken = '{YOUR-MAPBOX-TOKEN}';
4  const cbers_tiler_url = "{YOUR-API-GATEWAY-URL}";
```

## Workflow

1. One AWS ƛ call to get min/max percent cut value for all the bands and bounds

  *Path:* **/cbers/metdata/{cbers scene id}**

  *Inputs:*

  - sceneid: CBERS product id

  *Options:*

  - pmin: Histogram cut minimum value in percent (default: 2)  
  - pmax: Histogram cut maximum value in percent (default: 98)  

  *Output:* (dict)

  - bounds: (minX, minY, maxX, maxY) (list)
  - sceneid: scene id (string)
  - rgbMinMax: Min/Max DN values for the linear rescaling (dict)

  *Example:* `<api-gateway-url>/cbers/metadata/CBERS_4_MUX_20170915_166_105_L4?pmin=5&pmax=95`

2. Parallel AWS ƛ calls (one per mercator tile) to retrieve corresponding cbers data

  *Path:* **/cbers/tiles/{cbers scene id}/{z}/{x}/{y}.{ext}**

  *Inputs:*

  - sceneid: CBERS product id
  - x: Mercator tile X index
  - y: Mercator tile Y index
  - z: Mercator tile ZOOM level
  - ext: Image format to return ("jpg" or "png")

  *Options:*

  - rgb: Bands index for the RGB combination (default: (4, 3, 2))
  - histo: `-` delimited rgb histogram min/max (default: 0,16000-0,16000-0,16000 )
  - tile: Output image size (default: 256)

  *Output:*

  - base64 encoded image PNG or JPEG (string)

  *Example:*
  - `<api-gateway-url>/cbers/tiles/CBERS_4_MUX_20170915_166_105_L4/8/71/102.png`
  - `<api-gateway-url>/cbers/tiles/CBERS_4_MUX_20170915_166_105_L4/8/71/102.png?rgb=5,4,3&histo=100,3000-130,2700-500,4500&tile=1024`


---
#### Live Demo: https://viewer.remotepixel.ca

#### Infos & links
- [rio-tiler](https://github.com/mapbox/rio-tiler) rasterio plugin that process cbers data hosted on AWS S3.
- [Introducing the AWS Lambda Tiler](https://hi.stamen.com/stamen-aws-lambda-tiler-blog-post-76fc1138a145)
- Humanitarian OpenStreetMap Team [oam-dynamic-tiler](https://github.com/hotosm/oam-dynamic-tiler)
- [Linux Amazon AMI container](http://docs.aws.amazon.com/AmazonECR/latest/userguide/amazon_linux_container_image.html)
