#!/bin/bash

# Exit on any error
set -e

BUCKET="stablio-pdf-bucket20250212204333031300000001"
FUNCTION_URL="https://54aw52uonz2ubgqcssixegufbe0njtia.lambda-url.eu-west-1.on.aws/"

# List all objects in the bucket
echo "Fetching list of PDFs from bucket..."
aws s3api list-objects-v2 --bucket "$BUCKET" --query 'Contents[].Key' --output json | jq -r '.[]' | while read -r key; do
    if [ -n "$key" ]; then
        echo "Processing PDF: $key"
        # Call the Lambda function URL with the bucket and key
        response=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
            -H "Content-Type: application/json" \
            -d "{\"bucket\":\"$BUCKET\",\"key\":\"$key\"}")
        
        # Extract the status code
        http_code=$(echo "$response" | tail -n1)
        # Extract the response body
        body=$(echo "$response" | sed '$d')
        
        # Check if request was successful
        if [ "$http_code" -eq 200 ]; then
            echo "Successfully processed: $key"
        else
            echo "Error processing $key. Status code: $http_code"
            echo "Error response: $body"
        fi
        
        # Add a delay between requests to avoid overwhelming the Lambda
        sleep 1
    fi
done

echo "Processing complete!" 