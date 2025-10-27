#!/bin/bash
node cleanup-qdrant.js >> /home/ec2-user/cleanup-logs/cleanup-$(date +\%Y-\%m-\%d).log 2>&1
