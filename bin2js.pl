#!/usr/bin/perl -w

$dir = $ARGV[0];

print "var $dir = {};\n";
opendir(DIR, $dir) || die "can't opendir $dir: $!";
while ($file = readdir(DIR)) {
	next if $file =~ /^\./;
	print "${dir}['$file'] = '";
	open(FILE, "<$dir/$file") || die "can't open $file: $!";
	while (read(FILE, $str, 512)) {
		$str =~ s/([0-9\x00-\x1f\x7f-\xff\\\'\"])/ sprintf("\\%o", ord($1)) /egs;
		#$str =~ s/([^A-Za-z])/ sprintf("\\%o", ord($1)) /egs;
		print $str;
	}
	close(FILE);
	print "';\n"
};
#		STDOUT << "\\#{b.to_s(8)}"
closedir(DIR);
