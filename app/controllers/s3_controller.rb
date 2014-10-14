class S3Controller < ApplicationController
  def new
    s3data = S3_BUCKET.presigned_post(
                    key: "uploads/#{SecureRandom.uuid}/${filename}",
                    success_action_status: 201,
                    acl: :public_read
                  )
    render json: { fields: s3data.fields, url: s3data.url }
  end
end
