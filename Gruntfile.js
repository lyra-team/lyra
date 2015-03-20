module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		typescript: {
			base: {
				src: ['src/ts/**/*.ts'],
				dest: 'build/js/',
				options: {
					basePath: 'src/ts'
				}
			}
		},
		copy: {
			main: {
				expand: true,
				src: '**',
				dest: 'build/',
				cwd: 'public/'
			}
		},
		clean: {
			all: {
				src: ['build']
			}
		},
		watch: {
			ts: {
				files: ['src/js/**/*.ts'],
				tasks: ['build']
			},
			public: {
				files: ['public/**/*'],
				tasks: ['build']
			}
		},
		connect: {
			server: {
				options: {
					port: 8080,
					base: 'build'
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-typescript');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('build', ['clean:all', 'typescript', 'copy']);
	grunt.registerTask('default', ['build', 'connect', 'watch']);
};