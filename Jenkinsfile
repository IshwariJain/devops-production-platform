pipeline {
    agent any

    environment {
        APP_NAME = 'devops-flask-app'
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
    }
}
