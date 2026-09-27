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

        stage('Test') {
            steps {
                sh './scripts/run_tests.sh'
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    echo "===== Building Docker Image ====="
                    docker build -t devops-flask-app:ci ./app
                '''
            }
        }

        stage('Image Validation') {
            steps {
                sh '''
                    echo "===== Validating Docker Image ====="
                    docker image inspect devops-flask-app:ci
                '''
            }
        }
    }
}
