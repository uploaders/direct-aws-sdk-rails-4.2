== Direct S3 File Upload for Rails

This is a demo app for Rails for S3 file upload using aws-sdk and jQuery File Upload, useful for Heroku. A user can upload avatars for their friends. This is useful for creating a list of user profiles or a Who We Are page for a company site.

##Credit:
  * [Phil Wilt](http://github.com/phillwilt)
  * [Heroku Docs](https://devcenter.heroku.com/articles/direct-to-s3-image-uploads-in-rails)
  * [Bourbon, Neat, Bitters, Refills by thoughtbot](http://bourbon.io)

## Screenshots

![New Friend Form](https://s3-us-west-2.amazonaws.com/philwilt/githubimages/friendsnew.png)

![Friends View](https://s3-us-west-2.amazonaws.com/philwilt/githubimages/friendsindex.png)

## Tutorial

### Prerequistes

 * Basic Knowledge of Rails, Haml, jQuery and ajax.
 * Rails 4 or greater
 * AWS Account and S3 Bucket ([Tutorial](http://docs.aws.amazon.com/AmazonS3/latest/gsg/SigningUpforS3.html))


### Install aws-sdk gem

Add `gem 'aws-sdk'` to the gemfile. Then run `bundle install`.

### Configure aws-sdk gem

We will need to access and store our [aws secrets](http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSGettingStartedGuide/AWSCredentials.html) in a secure way.

First we are going to set environment variables. This is different on every system so use your googlefu. But we want to end up with the following environment variables:

```
AWS_ACCESS_KEY_ID='are_you_the_gate_keeper'
AWS_SECRET_ACCESS_KEY='i_am_the_key_master'
export S3_BUCKET='drop_in_the_bucket'
```

Next, we will create an initializer in `app/initializers/aws.rb' that contains the following:

```
AWS.config(access_key_id:     ENV['AWS_ACCESS_KEY_ID'],
           secret_access_key: ENV['AWS_SECRET_ACCESS_KEY'] )

S3_BUCKET = AWS::S3.new.buckets[ENV['S3_BUCKET']]

```

### Setup an endpoint to get our AWS variables

We are going to setup an endpoint for obtaining AWS variables. This is different than the Heroku tutorial as we don't want unobstrusive javascript (we don't? NO). So this will involve creating an S3controller (if we had a larger app we'd create a service for this).

Create a controller `app/controllers/s3_controller.rb`. In it we will have,

```
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
```

A presigned post is what allows us to post to amazon securly. Notice we have set a few configuration variables. In our `key` we upload to a folder called `uploads/#{SecureRandom.uuid}`. This is an uploads folder followed by a unique folder name which prevents filename overrides. The `success_action_status` is the header code to return upon upload. And then we set the permission on the file with our `acl` parameter. Next we render a json response with the parameters we need in our javascript, more on those to come.

### Install Haml gems (optional)

This is optional but I recommend adding Haml gems to make our view markup way cooler. Add the following to your gemfile and then run `bundle install`.

```
gem 'haml'
gem 'haml-rails' # Generator for Haml
```

### Create user

We will now create a user model and controller. First generate a model with `rails g model User name avatar_url && rake db:migrate`. The avatar_url will store the URL of the image on S3. Next, either generate a controller or make one manually.

```
# models/user.rb

class User < ActiveRecord::Base
  validates_presence_of :name
end
```

```
# models/users_controller.rb

class UsersController < ApplicationController
  before_action :set_user, only: [:show]

  # GET /users
  def index
    @users = User.all
  end

  # GET /users/new
  def new
    @user = User.new
  end

  # POST /users
  def create
    @user = User.new(user_params)

    if @user.save
      redirect_to users_path, success: 'User was successfully created.'
    else
      render :new
    end
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:name, :avatar_url, :profile_url)
  end
end

```

Alternatively, you can use a rails scaffold generator to create a user model, controller, views, and database migration. If you've installed the haml-rails gem, then the views will be generated in Haml.

Run `rails g scaffold User name avatar_url` and then `rake db:migrate`.

### Setup routes

Rails needs to know where to see all this stuff!

```
Rails.application.routes.draw do
  resources :users, only: [:index, :new, :create]
  get 'pspost', to: 's3#new'
  root 'users#index'
end
```

### Setup Views

Now we are going to setup our views so the user can actually do something!

First, we'll create a form partial.

```
# views/users/_form.html.haml

= form_for(@user, html: { class: 'direct-upload' }) do |f|
  - if @user.errors.any?
    #error_explanation
      %h2
        = pluralize(@user.errors.count, "error")
        prohibited this user from being saved:
      %ul
        - @user.errors.full_messages.each do |message|
          %li= message
  .field
    = f.label :name
    %br/
    = f.text_field :name
  .field
    = f.label :avatar_url, 'Avatar'
    %br/
    = f.file_field :avatar_url
  .actions
    = f.submit class: 'button round'
```

Now we'll create the view for a new user.

```
# app/views/users/new.html.haml

#head-wrapper
  %h1 New Friend
= render 'form'

```

### Install jQuery dependencies

You will to add two jQuery assets to your javascript assets folder.

Grab the [jQuery UI widget](https://raw.githubusercontent.com/jquery/jquery-ui/master/ui/widget.js) and [jQuery File Upload](https://raw.githubusercontent.com/blueimp/jQuery-File-Upload/master/js/jquery.fileupload.js) files and put them in `app/assets/javascript`. Rename `jquery.fileupload.js` to `z.jquery.fileupload.js` to force it to load afer the other jQuery files. If using `//= require_tree .` in `application.js` then the files are added by default. If not, make sure to require the the files manually.


### Javascript like a boss

Now we'll hook up the javascript to the form to actually give us upload functionally.

Create a javascript file (unobtrusive!) to hold our upload logic.

```
$(function() {
  if ($('.direct-upload').length > 0) {

    // Get our s3params from our endpoint
    $.get( "/pspost", function( s3params ) {

      // Attach the upload functionality to any file input
      $('.direct-upload').find("input:file").each(function(i, elem) {
        var fileInput    = $(elem);
        var form         = $(fileInput.parents('form:first'));
        var submitButton = form.find('input[type="submit"]');
        var progressBar  = $("<div class='meter'></div>");
        var barContainer = $("<div class='progress-bar'></div>").append(progressBar);
        fileInput.after(barContainer);

        fileInput.fileupload({
          fileInput:       fileInput,
          url:             "http://" + s3params.url.host,
          type:            'POST',
          autoUpload:       true,
          formData:         s3params.fields,
          paramName:        'file', // S3 does not like nested name fields i.e. name="user[avatar_url]"
          dataType:         'XML',  // S3 returns XML if success_action_status is set to 201
          replaceFileInput: false,
          progressall: function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            progressBar.css('width', progress + '%')
          },
          start: function (e) {
            submitButton.prop('disabled', true);
            barContainer.css('display', 'block');
            progressBar.
              css('display', 'block').
              css('width', '0%')
          },
          done: function(e, data) {
            submitButton.prop('disabled', false);

            progressBar.addClass('done');

            // extract key and generate URL from response
            var location   = $(data.jqXHR.responseXML).find("Location").text();

            // create hidden field
            var input = $("<input />", { type:'hidden', name: fileInput.attr('name'), value: location })
            form.append(input);
          },
          fail: function(e, data) {
            submitButton.prop('disabled', false);

            progressBar.
              css("background", "red").
          }
        });
      });
    }, 'json');
  }
});

```

The script waits for the DOM to load, checks for our upload form, attachs file upload objects to each, and then attachs callbacks. As you can see, we provide the user with a progress bar so they know what's going on (I used the [progress-bar refill](http://refills.bourbon.io)).

### Lets see all your friends!

Now that we have created our friends, we want to see them! I used the [grid-items refill](http://refills.bourbon.io).

```
# app/view/users/index.html.haml

%p#notice= notice
#head-wrapper
  %h1 Friends

#nav-wrapper
  = link_to 'New Friend', new_user_path, class: 'button round'

%br

.grid-items
  - @users.each do |user|
    = render 'users/user', user: user

%br
```

```
# app/view/users/index.html.haml

%a.grid-item{ href: '#' }
    = image_tag user.avatar_url
    %h1= user.name
```

### Your turn!

Fork the repo, add the ability to show a user, edit a user, and delete your friends just to troll them!

