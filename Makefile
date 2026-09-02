.PHONY: dev install build deploy

SERVICE   ?= multivac
REGION    ?= europe-west1
PROJECT   ?= rapyd-eu-data

dev:
	cd backend && uvicorn main:app --reload --port 8000

install:
	cd backend && pip install -r requirements.txt

build:
	docker build -t $(SERVICE) .

deploy:
	gcloud run deploy $(SERVICE) \
	  --source . \
	  --region $(REGION) \
	  --project $(PROJECT) \
	  --allow-unauthenticated \
	  --set-env-vars BQ_DEFAULT_PROJECT=$(PROJECT)
