var should = require('should'),
expect = require('chai').expect,
supertest = require('supertest'),
agent = supertest.agent('http://localhost:50000');

describe('Reticulum is Running', function(){
    it('home page loads', function(done){
    agent
        .get('/')                       
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            done();
        });
    });
});