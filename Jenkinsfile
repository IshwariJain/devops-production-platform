pipeline {
    agent any

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
                sh '''
                    echo "===== Build Information ====="
                    echo "Jenkins Build Number: $BUILD_NUMBER"
                    echo "Git Commit: $(git rev-parse HEAD)"
                    echo "Short Git Commit: $(git rev-parse --short HEAD)"
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
                    docker build -t devops-flask-app:$BUILD_NUMBER ./app
                '''
            }
        }

        stage('Image Validation') {
            steps {
                sh '''
                    echo "===== Validating Docker Image ====="
                    docker image inspect devops-flask-app:wrong-$BUILD_NUMBER
                '''
            }
        }
    }
}
