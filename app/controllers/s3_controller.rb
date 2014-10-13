class S3Controller < ApplicationController
  def show
    s3_direct_post = S3_BUCKET.presigned_post(
                    key: "uploads/#{SecureRandom.uuid}/${filename}",
                    success_action_status: 201,
                    acl: :public_read
                  )
    render json: {  fields: s3_direct_post.fields,
                    url: s3_direct_post.url
                  }
  end
end
