
function npmlink() {

  local from=$1
  local to=$2

  if [[ -z $from ]]; then
    echo "请指定 from。"
    return
  fi

  if [[ -z $to ]]; then
    echo "请指定 to。"
    return
  fi

  cd "${from}"
  npm pack

  rm -rf "${to}"
  mkdir -p "${to}"
  cd "${to}"

  tar -xf "${from}/"*.tgz
  mv package/* .

  rmdir package
  rm "${from}/"*.tgz

}