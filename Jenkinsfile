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
    }
}
