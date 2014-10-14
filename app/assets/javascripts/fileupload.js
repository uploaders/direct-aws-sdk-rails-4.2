$(function() {
  if ($('.direct-upload').length > 0) {
    $.get( "/pspost", function( s3params ) {

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
              text("Failed");
          }
        });
      });
    }, 'json');
  }
});
