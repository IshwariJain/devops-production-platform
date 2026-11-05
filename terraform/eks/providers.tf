terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
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
