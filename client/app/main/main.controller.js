'use strict';

angular.module('meccanoAdminApp')
  .controller('MainCtrl', function($scope, $interval, $state, DeviceStatus, $filter) {
    $scope.lastAnnouncements = [];
    $scope.status = {
      NORMAL:false,
      FAIL:true,
      WAITING_APPROVE:false,
      WARNING:true
    };
    $scope.statusResults = [];

    function loadDeviceStatus() {
      $scope.deviceStatus = {
        labels: [],
        data: [],
        colours:  [ '#d9534f','#5cb85c','#337ab7','#f0ad4e']
      };
      DeviceStatus.all().get({}, function(res) {
        angular.forEach(_.chain(res.data).sortBy('status').value(), function(item) {
          $scope.deviceStatus.labels.push(item.status);
          $scope.deviceStatus.data.push(item.count);
          $scope.deviceStatus.colours = colours($scope.deviceStatus.labels);
        });

      }, function(err) {
        console.log(err);
      });
    };

    // Load Statistics of Devices to populate the charts
    loadDeviceStatus();

    // Reload charts in five minutes
    $interval(function() {
      loadDeviceStatus();
      loadDeviceStatusHistory();
    }, 300000);

    function loadDeviceStatusHistory() {
      $scope.deviceStatusHistory = {
        labels: [],
        series: [],
        data: []
      };

      DeviceStatus.history().get({size:($scope.statusResults.length || 1)* 16,status:$scope.statusResults},function(resp) {
        var creationDateDefault = _.chain(resp).uniqBy('creationDate').reduce(function(result, item) {
          result.push({
            numberOfDevices: 0,
            creationDate: item.creationDate
          });
          return result;
        }, []).value();

        var chart = {
          labels: _.chain(resp).uniqBy('creationDate').map('creationDate').sort().map(function(date) {
            return $filter('date')(date, 'shortTime');
          }).value(),
          series: _.chain(resp).uniqBy('status').map('status').sort().value()
        };
        chart.data = _.reduce(chart.series, function(result, item) {
          result.push(_.chain(resp).filter({
            status: item
          }).unionBy(creationDateDefault, 'creationDate').sortBy('creationDate').map('numberOfDevices').value());
          return result;
        }, []);
        chart.colours= colours(chart.series);
        $scope.deviceStatusHistory = chart;
      });
    }

    var statusColours = {FAIL:'#d9534f',NORMAL:'#5cb85c',WAITING_APPROVE:'#337ab7',WARNING:'#f0ad4e'};
    function colours(series) {
      return _.chain(series).map(function(item) {
        return statusColours[item];
      }).value();
    }
    $scope.$watchCollection('status', function (newStatus, oldStatus) {

      if(_.countBy(newStatus).true){
        $scope.statusResults = [];
        angular.forEach(newStatus, function (value, key) {
          if (value) {
            $scope.statusResults.push(key);
          }
        });
        loadDeviceStatusHistory();
      }else {
        $scope.status = oldStatus;
      }

      });
    // Go to page Devices With selected status of the chart
    $scope.onClick = function(points, evt) {
      $state.go('device.list', {
        status: points[0].label
      });
    };
  });
