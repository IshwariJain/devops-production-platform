pipeline {
    agent any

    environment {
        APP_NAME = 'devops-flask-app'
        TEST_CONTAINER = 'devops-flask-runtime-test'
        AWS_DEFAULT_REGION = 'ap-south-1'
    }

    stages {
        stage('Checkout Verification') {
            steps {
                sh '''
                    echo "===== Pipeline Workspace ====="
                    pwd

                    echo "===== Repository Files ====="
                    ls -la

                    echo "===== Latest Commit ====="
                    git log -1 --oneline
                '''
            }
        }

        stage('Build Information') {
            steps {
                script {
                    env.GIT_SHA = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }

                sh '''
                    echo "===== Build Information ====="
                    echo "Jenkins Build Number: $BUILD_NUMBER"
                    echo "Git SHA: $GIT_SHA"
                    echo "Application Name: $APP_NAME"
                '''
            }
        }

        stage('Test') {
            steps {
                sh './scripts/run_tests.sh'
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    echo "===== Building Docker Image ====="
                    echo "Build Number Tag: $BUILD_NUMBER"
                    echo "Git SHA Tag: $GIT_SHA"

                    docker build \
                        -t $APP_NAME:$BUILD_NUMBER \
                        -t $APP_NAME:$GIT_SHA \
                        ./app
                '''
            }
        }

        stage('Image Validation') {
            steps {
                sh '''
                    echo "===== Validating Docker Images ====="
                    echo "GIT_SHA in validation stage: $GIT_SHA"

                    docker image inspect $APP_NAME:$BUILD_NUMBER
                    docker image inspect $APP_NAME:$GIT_SHA
                '''
            }
        }

        stage('Runtime Prerequisites') {
            steps {
                sh '''
                    echo "===== Checking Runtime Prerequisites ====="

                    if ! docker network inspect ci-network >/dev/null 2>&1; then
                        echo "ERROR: Required Docker network 'ci-network' does not exist"
                        exit 1
                    fi

                    echo "Docker network 'ci-network' exists"
                '''
            }
        }

        stage('Runtime Validation') {
            steps {
                sh '''
                    echo "===== Runtime Validation ====="

                    docker rm -f $TEST_CONTAINER 2>/dev/null || true

                    docker run -d \
                        --name $TEST_CONTAINER \
                        --network ci-network \
                        $APP_NAME:$BUILD_NUMBER

                    echo "Waiting for application health check..."

                    for i in 1 2 3 4 5 6; do
                        STATUS=$(docker inspect \
                            --format='{{.State.Health.Status}}' \
                            $TEST_CONTAINER)

                        echo "Health status: $STATUS"

                        if [ "$STATUS" = "healthy" ]; then
                            echo "Docker health check passed"

                            echo "===== Running HTTP Smoke Test ====="

                            curl --fail --silent --show-error \
                                http://$TEST_CONTAINER:5000/health

                            echo ""
                            echo "HTTP smoke test passed"
                            exit 0
                        fi

                        if [ "$STATUS" = "unhealthy" ]; then
                            echo "Runtime validation failed"
                            docker logs $TEST_CONTAINER
                            exit 1
                        fi

                        sleep 5
                    done

                    echo "Timed out waiting for healthy container"
                    docker logs $TEST_CONTAINER
                    exit 1
                '''
            }

            post {
                always {
                    sh '''
                        echo "===== Cleaning Up Runtime Test Container ====="
                        docker rm -f $TEST_CONTAINER 2>/dev/null || true
                    '''
                }
            }
        }

        stage('Push to AWS ECR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-ecr-credentials',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''#!/usr/bin/bash
                        set -euo pipefail

                        echo "===== AWS Identity Verification ====="

                        aws sts get-caller-identity \
                            --query Arn \
                            --output text

                        echo "===== ECR Repository ====="

                        AWS_ACCOUNT_ID=$(aws sts get-caller-identity \
                            --query Account --output text)

                        ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
                        ECR_REPOSITORY="$ECR_REGISTRY/$APP_NAME"

                        echo "===== Login to AWS ECR ====="

                        aws ecr get-login-password \
                            --region "$AWS_DEFAULT_REGION" |
                            docker login \
                                --username AWS \
                                --password-stdin "$ECR_REGISTRY"

                        echo "===== Tag Docker Images ====="

                        docker tag \
                            "$APP_NAME:$BUILD_NUMBER" \
                            "$ECR_REPOSITORY:$BUILD_NUMBER"

                        docker tag \
                            "$APP_NAME:$GIT_SHA" \
                            "$ECR_REPOSITORY:$GIT_SHA"

                        echo "===== Push Images to AWS ECR ====="

                        docker push "$ECR_REPOSITORY:$BUILD_NUMBER"
                        docker push "$ECR_REPOSITORY:$GIT_SHA"

                        echo "===== ECR Push Successful ====="
                    '''
                }
            }
        }
    }
}
