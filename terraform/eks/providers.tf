terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "devops-production-platform-tfstate-ap-mum"
    key          = "eks/terraform.tfstate"
    region       = "ap-south-1"
    profile      = "devops-project"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region  = "ap-south-1"
  profile = "devops-project"

  default_tags {
    tags = {
      Project   = "devops-production-platform"
      ManagedBy = "Terraform"
    }
  }
}
