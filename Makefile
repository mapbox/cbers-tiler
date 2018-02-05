
SHELL = /bin/bash

all: build package

build:
	docker build --tag lambda:latest .

#Local Test
test:
	docker run \
		-w /var/task/ \
		--name lambda \
		--env AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
		--env AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
 		--env AWS_REGION=us-east-1 \
		--env AWS_REQUEST_PAYER='requester' \
		--env PYTHONPATH=/var/task \
		--env GDAL_CACHEMAX=75% \
		--env GDAL_DISABLE_READDIR_ON_OPEN=TRUE \
		--env GDAL_TIFF_OVR_BLOCKSIZE=512 \
		--env VSI_CACHE=TRUE \
		--env VSI_CACHE_SIZE=536870912 \
		-itd \
		lambda:latest
	docker cp package.zip lambda:/tmp/package.zip
	docker exec -it lambda bash -c 'unzip -q /tmp/package.zip -d /var/task/'
	docker exec -it lambda bash -c 'pip3 install boto3 jmespath python-dateutil -t /var/task'
	docker exec -it lambda python3 -c 'from app.cbers import APP; print(APP({"path": "/cbers/bounds/CBERS_4_MUX_20171121_057_094_L2", "queryStringParameters": "null", "pathParameters": "null", "requestContext": "null", "httpMethod": "GET"}, None))'
	docker exec -it lambda python3 -c 'from app.cbers import APP; print(APP({"path": "/cbers/metadata/CBERS_4_MUX_20171121_057_094_L2", "queryStringParameters": {"pmin":"2", "pmax":"99.8"}, "pathParameters": "null", "requestContext": "null", "httpMethod": "GET"}, None))'
	docker exec -it lambda python3 -c 'from app.cbers import APP; print(APP({"path": "/cbers/processing/CBERS_4_MUX_20171121_057_094_L2/10/664/495.png", "queryStringParameters": {"ratio":"(b8-b7)/(b8+b7)"}, "pathParameters": "null", "requestContext": "null", "httpMethod": "GET"}, None))'
	docker exec -it lambda python3 -c 'from app.cbers import APP; print(APP({"path": "/cbers/tiles/CBERS_4_MUX_20171121_057_094_L2/10/664/495.png", "queryStringParameters": {"rgb":"8"}, "pathParameters": "null", "requestContext": "null", "httpMethod": "GET"}, None))'
	docker exec -it lambda python3 -c 'from app.cbers import APP; print(APP({"path": "/cbers/tiles/CBERS_4_MUX_20171121_057_094_L2/10/664/495.png", "queryStringParameters": {"rgb":"7,5,5"}, "pathParameters": "null", "requestContext": "null", "httpMethod": "GET"}, None))'
	docker stop lambda
	docker rm lambda


package:
	docker run \
		-w /var/task/ \
		--name lambda \
		-itd \
		lambda:latest
	docker cp lambda:/tmp/package.zip package.zip
	docker stop lambda
	docker rm lambda

shell:
	docker run \
		--name lambda  \
		--volume $(shell pwd)/:/data \
		--env PYTHONPATH=/var/task/vendored \
		--env GDAL_CACHEMAX=75% \
		--env GDAL_DISABLE_READDIR_ON_OPEN=TRUE \
		--env GDAL_TIFF_OVR_BLOCKSIZE=512 \
		--env VSI_CACHE=TRUE \
		--env VSI_CACHE_SIZE=536870912 \
		--rm \
		-it \
		lambda:latest /bin/bash

deploy:
	sls deploy

clean:
	docker stop lambda
	docker rm lambda
